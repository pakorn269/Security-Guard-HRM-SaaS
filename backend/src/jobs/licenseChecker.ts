import { supabaseAdmin } from '../config/supabase.js';
import { NotificationService } from '../modules/notifications/notifications.service.js';
import logger from '../utils/logger.js';

export const checkLicenses = async () => {
    logger.info('🔍 Starting License Compliance Check...');
    const today = new Date().toISOString().split('T')[0];

    try {
        // 1. Check for EXPIRED licenses (Tor Phor 7)
        // Rule: If license_expires_at < Today AND status is NOT suspended/terminated
        const { data: expiredEmployees, error: fetchError } = await supabaseAdmin
            .from('employees')
            .select('id, full_name, company_id, license_number, license_expires_at, user_id')
            .lt('license_expires_at', today)
            .neq('status', 'suspended')
            .neq('status', 'terminated');

        if (fetchError) throw fetchError;

        if (expiredEmployees && expiredEmployees.length > 0) {
            logger.info(`Found ${expiredEmployees.length} employees with expired licenses.`);

            for (const emp of expiredEmployees) {
                // strict lock: Suspend the employee
                const { error: updateError } = await supabaseAdmin
                    .from('employees')
                    .update({
                        status: 'suspended',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', emp.id);

                if (updateError) {
                    logger.error(`Failed to suspend employee ${emp.id}`, updateError);
                    continue;
                }

                // Notify Company Admin (System Notification)
                // We need to find the company admin for this company
                // For now, we'll try to notify the employee themselves if they have a user_id
                // In a real scenario, we should query broader admin users.

                // Notify the Employee
                if (emp.user_id) {
                    await NotificationService.createNotification({
                        companyId: emp.company_id,
                        userId: emp.user_id,
                        type: 'cert_expiring', // reuse this type or 'system'
                        title: 'ใบอนุญาตธภ.7 หมดอายุ / License Expired',
                        titleTh: 'ใบอนุญาตธภ.7 หมดอายุ',
                        message: `License ${emp.license_number} has expired. Your account is suspended.`,
                        messageTh: `ใบอนุญาตเลขที่ ${emp.license_number} หมดอายุแล้ว บัญชีของคุณถูกระงับชั่วคราว`,
                        data: { employeeId: emp.id, licenseNumber: emp.license_number }
                    });
                }

                // TODO: Notify Company Admins (Requires querying users with role 'company_admin' for this company_id)
            }
        }

        // 2. Check for EXPIRING licenses (Warning: 60 days and 30 days)
        const warningDays = [60, 30];

        for (const days of warningDays) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + days);
            const targetDateStr = targetDate.toISOString().split('T')[0];

            const { data: expiringEmployees, error: warningError } = await supabaseAdmin
                .from('employees')
                .select('id, full_name, company_id, license_number, license_expires_at, user_id')
                .eq('license_expires_at', targetDateStr)
                .neq('status', 'suspended')
                .neq('status', 'terminated');

            if (warningError) throw warningError;

            if (expiringEmployees && expiringEmployees.length > 0) {
                for (const emp of expiringEmployees) {
                    if (emp.user_id) {
                        await NotificationService.createNotification({
                            companyId: emp.company_id,
                            userId: emp.user_id,
                            type: 'cert_expiring',
                            title: `แจ้งเตือนใบอนุญาตหมดอายุ (${days} วัน)`,
                            titleTh: `แจ้งเตือนใบอนุญาตหมดอายุ (${days} วัน)`,
                            message: `Your license ${emp.license_number} will expire in ${days} days. Please renew immediately.`,
                            messageTh: `ใบอนุญาตเลขที่ ${emp.license_number} ของคุณจะหมดอายุในอีก ${days} วัน กรุณาต่ออายุทันที`,
                            data: { employeeId: emp.id, daysRemaining: days }
                        });
                    }
                }
            }
        }

        logger.info('✅ License Compliance Check completed.');

    } catch (error) {
        logger.error('❌ Error running License Compliance Check', error);
    }
};
