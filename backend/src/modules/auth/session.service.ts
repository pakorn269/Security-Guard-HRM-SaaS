import crypto from 'crypto';
import { supabaseAdmin } from '../../config/supabase.js';
import logger from '../../utils/logger.js';
import type {
    SessionInfo,
    SessionRow,
    CreateSessionData,
    DeviceType,
} from './auth.types.js';

class SessionService {
    /**
     * Hash a refresh token using SHA-256
     */
    hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Parse User-Agent to get a friendly device name
     */
    parseDeviceName(userAgent?: string): string {
        if (!userAgent) return 'Unknown Device';

        // Common browsers
        if (userAgent.includes('LINE')) {
            if (userAgent.includes('iOS')) return 'LINE App (iOS)';
            if (userAgent.includes('Android')) return 'LINE App (Android)';
            return 'LINE App';
        }
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
            if (userAgent.includes('Mobile')) return 'Chrome Mobile';
            return 'Chrome';
        }
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            if (userAgent.includes('Mobile')) return 'Safari Mobile';
            return 'Safari';
        }
        if (userAgent.includes('Firefox')) {
            if (userAgent.includes('Mobile')) return 'Firefox Mobile';
            return 'Firefox';
        }
        if (userAgent.includes('Edg')) return 'Microsoft Edge';

        // OS detection as fallback
        if (userAgent.includes('Windows')) return 'Windows Browser';
        if (userAgent.includes('Mac')) return 'Mac Browser';
        if (userAgent.includes('Linux')) return 'Linux Browser';
        if (userAgent.includes('Android')) return 'Android Browser';
        if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS Browser';

        return 'Unknown Device';
    }

    /**
     * Detect device type from User-Agent
     */
    detectDeviceType(userAgent?: string, isLiff?: boolean): DeviceType {
        if (isLiff) return 'liff';
        if (!userAgent) return 'web';

        const ua = userAgent.toLowerCase();
        if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
        return 'web';
    }

    /**
     * Create a new session record
     */
    async createSession(data: CreateSessionData): Promise<string> {
        const tokenHash = this.hashToken(data.refreshToken);
        const deviceName = data.deviceName || this.parseDeviceName(data.userAgent);
        const deviceType = data.deviceType || this.detectDeviceType(data.userAgent);

        const { data: session, error } = await supabaseAdmin
            .from('user_sessions')
            .insert({
                user_id: data.userId,
                company_id: data.companyId,
                refresh_token_hash: tokenHash,
                device_name: deviceName,
                device_type: deviceType,
                user_agent: data.userAgent || null,
                ip_address: data.ipAddress || null,
                expires_at: data.expiresAt.toISOString(),
                last_activity_at: new Date().toISOString(),
            })
            .select('id')
            .single();

        if (error || !session) {
            logger.error('Failed to create session', error);
            throw new Error('Failed to create session');
        }

        logger.info('Session created', {
            sessionId: session.id,
            userId: data.userId,
            deviceType,
            deviceName,
        });

        return session.id;
    }

    /**
     * Validate a refresh token and return the session
     */
    async validateRefreshToken(
        refreshToken: string,
        sessionId: string
    ): Promise<SessionRow | null> {
        const tokenHash = this.hashToken(refreshToken);

        const { data: session, error } = await supabaseAdmin
            .from('user_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('refresh_token_hash', tokenHash)
            .is('revoked_at', null)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (error || !session) {
            return null;
        }

        return session as SessionRow;
    }

    /**
     * Update session with new refresh token (rotation)
     */
    async rotateRefreshToken(
        sessionId: string,
        newRefreshToken: string,
        newExpiresAt: Date
    ): Promise<void> {
        const newTokenHash = this.hashToken(newRefreshToken);

        const { error } = await supabaseAdmin
            .from('user_sessions')
            .update({
                refresh_token_hash: newTokenHash,
                expires_at: newExpiresAt.toISOString(),
                last_activity_at: new Date().toISOString(),
            })
            .eq('id', sessionId);

        if (error) {
            logger.error('Failed to rotate refresh token', error);
            throw new Error('Failed to rotate refresh token');
        }

        logger.debug('Refresh token rotated', { sessionId });
    }

    /**
     * Get all active sessions for a user
     */
    async getUserSessions(
        userId: string,
        currentSessionId?: string
    ): Promise<SessionInfo[]> {
        const { data: sessions, error } = await supabaseAdmin
            .from('user_sessions')
            .select('*')
            .eq('user_id', userId)
            .is('revoked_at', null)
            .gt('expires_at', new Date().toISOString())
            .order('last_activity_at', { ascending: false });

        if (error) {
            logger.error('Failed to get user sessions', error);
            throw new Error('Failed to get user sessions');
        }

        return (sessions || []).map((session: SessionRow) => ({
            id: session.id,
            deviceName: session.device_name,
            deviceType: session.device_type as DeviceType,
            ipAddress: session.ip_address,
            lastActivityAt: session.last_activity_at,
            createdAt: session.created_at,
            isCurrent: session.id === currentSessionId,
        }));
    }

    /**
     * Revoke a specific session
     */
    async revokeSession(
        sessionId: string,
        userId: string,
        reason: string = 'remote_logout'
    ): Promise<boolean> {
        const { data, error } = await supabaseAdmin
            .from('user_sessions')
            .update({
                revoked_at: new Date().toISOString(),
                revoked_reason: reason,
            })
            .eq('id', sessionId)
            .eq('user_id', userId)
            .is('revoked_at', null)
            .select('id')
            .single();

        if (error || !data) {
            logger.warn('Failed to revoke session or session not found', {
                sessionId,
                userId,
                error,
            });
            return false;
        }

        logger.info('Session revoked', { sessionId, userId, reason });
        return true;
    }

    /**
     * Revoke all sessions for a user
     */
    async revokeAllSessions(
        userId: string,
        reason: string = 'logout_all',
        excludeSessionId?: string
    ): Promise<number> {
        let query = supabaseAdmin
            .from('user_sessions')
            .update({
                revoked_at: new Date().toISOString(),
                revoked_reason: reason,
            })
            .eq('user_id', userId)
            .is('revoked_at', null);

        if (excludeSessionId) {
            query = query.neq('id', excludeSessionId);
        }

        const { data, error } = await query.select('id');

        if (error) {
            logger.error('Failed to revoke all sessions', error);
            throw new Error('Failed to revoke all sessions');
        }

        const count = data?.length || 0;
        logger.info('All sessions revoked', { userId, count, reason, excludeSessionId });
        return count;
    }

    /**
     * Revoke session by refresh token hash
     */
    async revokeSessionByToken(
        refreshToken: string,
        userId: string,
        reason: string = 'user_logout'
    ): Promise<boolean> {
        const tokenHash = this.hashToken(refreshToken);

        const { data, error } = await supabaseAdmin
            .from('user_sessions')
            .update({
                revoked_at: new Date().toISOString(),
                revoked_reason: reason,
            })
            .eq('refresh_token_hash', tokenHash)
            .eq('user_id', userId)
            .is('revoked_at', null)
            .select('id')
            .single();

        if (error || !data) {
            logger.warn('Failed to revoke session by token', { userId, error });
            return false;
        }

        logger.info('Session revoked by token', { sessionId: data.id, userId, reason });
        return true;
    }

    /**
     * Update last activity timestamp for a session
     */
    async updateLastActivity(sessionId: string): Promise<void> {
        await supabaseAdmin
            .from('user_sessions')
            .update({ last_activity_at: new Date().toISOString() })
            .eq('id', sessionId);
    }

    /**
     * Cleanup expired sessions (for cron job)
     */
    async cleanupExpiredSessions(): Promise<number> {
        const { data, error } = await supabaseAdmin
            .from('user_sessions')
            .delete()
            .lt('expires_at', new Date().toISOString())
            .select('id');

        if (error) {
            logger.error('Failed to cleanup expired sessions', error);
            return 0;
        }

        const count = data?.length || 0;
        if (count > 0) {
            logger.info('Cleaned up expired sessions', { count });
        }
        return count;
    }
}

export const sessionService = new SessionService();
export default sessionService;
