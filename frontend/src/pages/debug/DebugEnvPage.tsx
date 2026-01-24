/**
 * Debug page to inspect environment variables
 * Temporarily showing in all modes for debugging
 */
import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/react';
import api from '../../services/api';

/**
 * Debug page to inspect environment variables and db schema
 * Temporarily showing in all modes for debugging
 */
export default function DebugEnvPage() {
    const [schemaStatus, setSchemaStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN
            ? import.meta.env.VITE_SENTRY_DSN.substring(0, 20) + '...'
            : '(not set)',
    };

    useEffect(() => {
        const fetchSchema = async () => {
            setLoading(true);
            try {
                // Fetch schema info manually since it's a new endpoint not in typed client yet
                const response = await api.get('/health/schema');
                if (response.data.success) {
                    setSchemaStatus(response.data.data);
                } else {
                    setError('Failed to fetch schema: ' + response.data.error?.message);
                }
            } catch (err: any) {
                setError('Error fetching schema: ' + (err.message || 'Unknown error'));
            } finally {
                setLoading(false);
            }
        };

        fetchSchema();
    }, []);

    const handleTestSentryError = () => {
        try {
            throw new Error('Test Sentry Error: Manually triggered for verification');
        } catch (error) {
            Sentry.captureException(error);
            alert('Error sent to Sentry!');
        }
    };

    const handleTestSentryTransaction = () => {
        Sentry.startSpan(
            {
                op: 'ui.click',
                name: 'Test Button Click',
            },
            () => {
                // Simulate some work
                console.log('Testing Sentry Transaction');
                alert('Transaction sent to Sentry!');
            }
        );
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <section>
                <h1 className="text-2xl font-bold mb-4">Frontend Environment</h1>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
                    <pre className="text-sm overflow-auto">
                        {JSON.stringify(envVars, null, 2)}
                    </pre>
                </div>
            </section>

            <section>
                <h2 className="text-xl font-bold mb-4">Sentry Verification</h2>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 flex flex-wrap gap-4">
                    <button
                        onClick={handleTestSentryError}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors cursor-pointer"
                    >
                        Test Sentry Error (Captured)
                    </button>

                    <button
                        onClick={() => {
                            // Throw outside React's event handler to trigger global error handler
                            setTimeout(() => {
                                throw new Error('This is your first error!');
                            }, 0);
                        }}
                        className="px-4 py-2 bg-red-800 text-white rounded hover:bg-red-900 transition-colors cursor-pointer font-bold animate-pulse"
                    >
                        Break the world
                    </button>

                    <button
                        onClick={handleTestSentryTransaction}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                        Test Sentry Transaction
                    </button>
                </div>
            </section>

            <section>
                <h2 className="text-xl font-bold mb-4">Backend Schema Health</h2>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
                    {loading && <p>Loading schema status...</p>}
                    {error && <p className="text-red-500">{error}</p>}
                    {schemaStatus && (
                        <div className="space-y-4">
                            {Object.entries(schemaStatus).map(([table, info]: [string, any]) => (
                                <div key={table} className="border-b pb-4 last:border-0">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        {table}
                                        {info.exists ? (
                                            <span className="text-green-500 text-sm bg-green-100 px-2 py-0.5 rounded">Exists</span>
                                        ) : (
                                            <span className="text-red-500 text-sm bg-red-100 px-2 py-0.5 rounded">Missing</span>
                                        )}
                                    </h3>

                                    {!info.exists && (
                                        <p className="text-red-500 text-sm mt-1">{info.error}</p>
                                    )}

                                    {info.exists && info.columns && (
                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                            {Object.entries(info.columns).map(([col, exists]: [string, any]) => (
                                                <div key={col} className="flex items-center gap-2 text-sm">
                                                    <div className={`w-2 h-2 rounded-full ${exists ? 'bg-green-500' : 'bg-red-500'}`} />
                                                    <span className={exists ? 'text-gray-700 dark:text-gray-300' : 'text-red-600 font-medium'}>
                                                        {col}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <p className="text-sm text-gray-500">
                Build time: {new Date().toISOString()}
            </p>
        </div>
    );
}
