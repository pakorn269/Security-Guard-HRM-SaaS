/**
 * Debug page to inspect environment variables
 * Temporarily showing in all modes for debugging
 */
export default function DebugEnvPage() {
    const envVars = {
        MODE: import.meta.env.MODE,
        DEV: import.meta.env.DEV,
        PROD: import.meta.env.PROD,
        VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '(not set)',
        VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL
            ? import.meta.env.VITE_SUPABASE_URL.substring(0, 30) + '...'
            : '(not set)',
        VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
            ? import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20) + '...'
            : '(not set)',
        VITE_LIFF_ID: import.meta.env.VITE_LIFF_ID || '(not set)',
        VITE_LIFF_LINK_ID: import.meta.env.VITE_LIFF_LINK_ID || '(not set)',
        VITE_LIFF_CLOCK_ID: import.meta.env.VITE_LIFF_CLOCK_ID || '(not set)',
        VITE_LIFF_SCHEDULE_ID: import.meta.env.VITE_LIFF_SCHEDULE_ID || '(not set)',
        VITE_LIFF_LEAVE_ID: import.meta.env.VITE_LIFF_LEAVE_ID || '(not set)',
        VITE_LIFF_PROFILE_ID: import.meta.env.VITE_LIFF_PROFILE_ID || '(not set)',
        VITE_APP_NAME: import.meta.env.VITE_APP_NAME || '(not set)',
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Frontend Debug Environment</h1>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
                <pre className="text-sm overflow-auto">
                    {JSON.stringify(envVars, null, 2)}
                </pre>
            </div>
            <p className="mt-4 text-sm text-gray-500">
                Build time: {new Date().toISOString()}
            </p>
        </div>
    );
}
