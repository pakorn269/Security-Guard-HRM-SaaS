import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Create Supabase admin client (bypasses RLS)
export const supabaseAdmin: SupabaseClient = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        db: {
            schema: 'public',
        },
    }
);

// Create Supabase client factory (respects RLS)
export const createSupabaseClient = (accessToken?: string): SupabaseClient => {
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        global: {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};

// Set RLS context for a request
export const setRLSContext = async (
    companyId: string,
    userRole: string
): Promise<void> => {
    await supabaseAdmin.rpc('set_config', {
        setting: 'app.current_company_id',
        value: companyId,
    });
    await supabaseAdmin.rpc('set_config', {
        setting: 'app.current_user_role',
        value: userRole,
    });
};

export default supabaseAdmin;
