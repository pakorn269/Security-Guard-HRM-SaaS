import { supabaseAdmin } from '../../config/supabase.js';
import {
    ConflictError,
    NotFoundError,
} from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import { PhoneUtils } from '../../utils/phone.js';
import { authService } from './auth.service.js';
import type { LoginResponse } from './auth.types.js';

export class LineLinkingService {
    /**
     * Auto-link employee with Code + Phone
     * Handles exact matches (Auto-link) and partial matches (Create Request)
     */
    async autoLinkEmployee(
        idToken: string,
        liffId: string,
        employeeCode: string,
        phone: string,
        companySlug?: string
    ): Promise<{
        success: boolean;
        data?: LoginResponse;
        pendingApproval?: boolean;
        requestId?: string;
        message?: string;
        requireCompanySlug?: boolean;
    }> {
        logger.info('Auto-link attempt', { employeeCode, companySlug, hasPhone: !!phone });

        // 1. Verify LINE ID token
        const verifyResult = await authService.lineVerify(idToken, liffId);

        if (verifyResult.isLinked) {
            throw new ConflictError(
                'Account already linked',
                'บัญชี LINE นี้เชื่อมต่อกับผู้ใช้แล้ว'
            );
        }

        const lineProfile = verifyResult.lineProfile!;
        const lineUserId = lineProfile.userId;
        const normalizedPhone = PhoneUtils.normalize(phone);

        // 2. Check if there is already a PENDING request for this LINE user
        const { data: existingRequest } = await supabaseAdmin
            .from('line_link_requests')
            .select('id, status')
            .eq('line_user_id', lineUserId)
            .eq('status', 'pending')
            .single();

        if (existingRequest) {
            return {
                success: true,
                pendingApproval: true,
                requestId: existingRequest.id,
                message: 'You have a pending request waiting for approval.',
            };
        }

        // 3. Find Employee
        let employee = null;
        let company = null;
        let matchType: 'exact' | 'phone_only' | 'code_only' | 'none' = 'none';

        // Helper to get company by ID
        const getCompany = async (id: string) => {
            const { data } = await supabaseAdmin
                .from('companies')
                .select('*')
                .eq('id', id)
                .single();
            return data;
        };

        // Strategy A: If Company Slug provided, restrict search
        if (companySlug) {
            const { data: comp } = await supabaseAdmin
                .from('companies')
                .select('*')
                .eq('slug', companySlug)
                .single();

            if (!comp) {
                throw new NotFoundError('Company not found', 'ไม่พบข้อมูลบริษัท');
            }
            company = comp;
            logger.info('Company found', { companyId: company.id, slug: companySlug });

            // Search in this company
            // Try exact match first (employee_code + phone)
            logger.info('Searching for employee', {
                companyId: company.id,
                employeeCode,
                normalizedPhone,
                searchType: 'exact'
            });

            const { data: exactMatch, error: exactError } = await supabaseAdmin
                .from('employees')
                .select('*, users:user_id(*)')
                .eq('company_id', company.id)
                .eq('employee_code', employeeCode)
                .eq('phone', normalizedPhone)
                .single();

            if (exactError) {
                logger.info('Exact match search result', { found: false, error: exactError.code });
            }

            if (exactMatch) {
                employee = exactMatch;
                matchType = 'exact';
                logger.info('Exact match found', { employeeId: employee.id });
            } else {
                // Try Phone match
                logger.info('Trying phone-only match', { normalizedPhone });
                const { data: phoneMatch, error: phoneError } = await supabaseAdmin
                    .from('employees')
                    .select('*, users:user_id(*)')
                    .eq('company_id', company.id)
                    .eq('phone', normalizedPhone)
                    .single();

                if (phoneError) {
                    logger.info('Phone match search result', { found: false, error: phoneError.code });
                }

                if (phoneMatch) {
                    employee = phoneMatch;
                    matchType = 'phone_only';
                    logger.info('Phone match found', { employeeId: employee.id, employeeCode: employee.employee_code });
                } else {
                    // Try Code match
                    logger.info('Trying code-only match', { employeeCode });
                    const { data: codeMatch, error: codeError } = await supabaseAdmin
                        .from('employees')
                        .select('*, users:user_id(*)')
                        .eq('company_id', company.id)
                        .eq('employee_code', employeeCode)
                        .single();

                    if (codeError) {
                        logger.info('Code match search result', { found: false, error: codeError.code });
                    }

                    if (codeMatch) {
                        employee = codeMatch;
                        matchType = 'code_only';
                        logger.info('Code match found', { employeeId: employee.id, phone: employee.phone });
                    } else {
                        logger.info('No employee match found in company', {
                            companyId: company.id,
                            employeeCode,
                            normalizedPhone
                        });
                    }
                }
            }
        } else {
            // Strategy B: Global Search
            // Try Exact Match (Code + Phone)
            const { data: exactMatches } = await supabaseAdmin
                .from('employees')
                .select('*, users:user_id(*)')
                .eq('employee_code', employeeCode)
                .eq('phone', normalizedPhone);

            if (exactMatches && exactMatches.length === 1) {
                employee = exactMatches[0];
                company = await getCompany(employee.company_id);
                matchType = 'exact';
            } else if (exactMatches && exactMatches.length > 1) {
                // Ambiguous
                return {
                    success: false,
                    requireCompanySlug: true,
                    message: 'Multiple matches found. Please enter Company Code.',
                };
            } else {
                // Try Phone Match (Unique Phone assumption)
                const { data: phoneMatches } = await supabaseAdmin
                    .from('employees')
                    .select('*, users:user_id(*)')
                    .eq('phone', normalizedPhone);

                if (phoneMatches && phoneMatches.length === 1) {
                    employee = phoneMatches[0];
                    company = await getCompany(employee.company_id);
                    matchType = 'phone_only';
                } else if (phoneMatches && phoneMatches.length > 1) {
                    return {
                        success: false,
                        requireCompanySlug: true,
                        message: 'Multiple matches found. Please enter Company Code.',
                    };
                } else {
                    // Try Code Match
                    const { data: codeMatches } = await supabaseAdmin
                        .from('employees')
                        .select('*, users:user_id(*)')
                        .eq('employee_code', employeeCode);

                    if (codeMatches && codeMatches.length === 1) {
                        employee = codeMatches[0];
                        company = await getCompany(employee.company_id);
                        matchType = 'code_only';
                    } else {
                        // Ambiguous or Not Found
                        return {
                            success: false,
                            requireCompanySlug: true,
                            message: 'Employee not found or multiple matches.',
                        };
                    }
                }
            }
        }

        if (!employee || !company) {
            return {
                success: false,
                requireCompanySlug: true,
                message: 'Employee not found.',
            };
        }

        // 4. Handle Match
        if (matchType === 'exact') {
            // Auto Link
            logger.info('Exact match found, auto-linking', { employeeId: employee.id });

            // Check if user exists
            let user = employee.users;

            if (user) {
                // Check if user already has LINE linked
                if (user.line_user_id) {
                    throw new ConflictError(
                        'This employee account is already linked to a LINE account',
                        'บัญชีพนักงานนี้เชื่อมต่อกับ LINE อื่นแล้ว'
                    );
                }

                // Update existing user
                const { data: updatedUser, error: updateError } = await supabaseAdmin
                    .from('users')
                    .update({
                        line_user_id: lineUserId,
                        line_display_name: lineProfile.displayName,
                        line_picture_url: lineProfile.pictureUrl,
                        line_linked_at: new Date().toISOString(),
                        last_login_at: new Date().toISOString(),
                    })
                    .eq('id', user.id)
                    .select()
                    .single();

                if (updateError || !updatedUser) {
                    throw new Error('Failed to link LINE account');
                }
                user = updatedUser;
            } else {
                // Create new user
                const { data: newUser, error: createError } = await supabaseAdmin
                    .from('users')
                    .insert({
                        company_id: company.id,
                        employee_id: employee.id,
                        email: `employee_${employee.id}@guard.local`,
                        role: 'guard',
                        line_user_id: lineUserId,
                        line_display_name: lineProfile.displayName,
                        line_picture_url: lineProfile.pictureUrl,
                        line_linked_at: new Date().toISOString(),
                        is_active: true,
                        language: 'th',
                    })
                    .select()
                    .single();

                if (createError || !newUser) {
                    throw new Error('Failed to create user account');
                }
                // Update employee with user_id
                await supabaseAdmin
                    .from('employees')
                    .update({ user_id: newUser.id })
                    .eq('id', employee.id);

                user = newUser;
            }

            // Create tokens using AuthService public method
            const tokens = await authService.createSessionAndTokens(
                {
                    userId: user.id,
                    companyId: user.company_id,
                    role: user.role,
                    email: user.email,
                    employeeId: user.employee_id,
                    lineUserId: user.line_user_id,
                },
                {
                    isLiff: true,
                    liffContext: { isLiff: true, liffId, issuedAt: Date.now() }
                }
            );

            return {
                success: true,
                data: {
                    user: {
                        id: user.id as string,
                        email: user.email as string,
                        role: user.role as 'super_admin' | 'company_admin' | 'manager' | 'guard',
                        companyId: user.company_id as string,
                        employeeId: user.employee_id as string,
                        lineUserId: user.line_user_id as string,
                        lineDisplayName: user.line_display_name as string,
                        linePictureUrl: user.line_picture_url as string,
                        language: (user.language as string) || 'th',
                        isActive: user.is_active as boolean,
                        hasPin: !!(user.password_hash),
                    },
                    tokens
                }
            };

        } else {
            // Partial Match (Phone matched but code diff, or Code matched but phone diff)
            // Create Link Request

            logger.info('Partial match found, creating request', {
                employeeId: employee.id,
                matchType
            });

            const { data: request, error: requestError } = await supabaseAdmin
                .from('line_link_requests')
                .insert({
                    line_user_id: lineUserId,
                    line_display_name: lineProfile.displayName,
                    line_picture_url: lineProfile.pictureUrl,
                    employee_id: employee.id,
                    company_id: company.id,
                    entered_phone: normalizedPhone,
                    entered_employee_code: employeeCode,
                    phone_matched: matchType === 'phone_only',
                    code_matched: matchType === 'code_only',
                    status: 'pending'
                })
                .select()
                .single();

            if (requestError) {
                logger.error('Failed to create link request', requestError);
                throw new Error('Failed to create link request');
            }

            return {
                success: true,
                pendingApproval: true,
                requestId: request.id,
                message: 'Partial match. Request sent for admin approval.',
            };
        }
    }
}

export const lineLinkingService = new LineLinkingService();
