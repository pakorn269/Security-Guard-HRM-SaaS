import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment variables schema
const envSchema = z.object({
    // Server
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3001'),
    API_VERSION: z.string().default('v1'),

    // Supabase
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),

    // JWT
    JWT_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    // LINE
    LINE_CHANNEL_ID: z.string().optional(),
    LINE_CHANNEL_SECRET: z.string().optional(),
    LINE_CHANNEL_ACCESS_TOKEN: z.string().optional(),

    // LIFF
    LIFF_SCHEDULE_ID: z.string().optional(),
    LIFF_CLOCK_ID: z.string().optional(),
    LIFF_LEAVE_ID: z.string().optional(),
    LIFF_PROFILE_ID: z.string().optional(),

    // CORS
    CORS_ORIGIN: z.string().default('http://localhost:5173'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
    RATE_LIMIT_MAX: z.string().default('100'),
});

// Validate and parse environment variables
const parseEnv = () => {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.issues.map((issue) => issue.path.join('.'));
            console.error('❌ Missing or invalid environment variables:', missingVars);
            console.error('Please check your .env file');
        }
        throw error;
    }
};

export const env = parseEnv();

export type Env = z.infer<typeof envSchema>;
