import express, { Application, json, urlencoded } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';

import { env } from './config/env.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js';
import logger from './utils/logger.js';

// Route imports
import healthRoutes from './modules/health/health.routes.js';
import { authRoutes, linkRequestsRoutes } from './modules/auth/index.js';
import { companyRoutes } from './modules/company/index.js';
import { userRoutes } from './modules/user/index.js';
import { employeeRoutes } from './modules/employee/index.js';
import { shiftRoutes } from './modules/shift/index.js';
import { attendanceRoutes } from './modules/attendance/index.js';
import {
    leaveTypesRouter as leaveTypeRoutes,
    leaveRequestsRouter as leaveRequestRoutes,
    leaveBalancesRouter as leaveBalanceRoutes,
    leaveTemplatesRouter as leaveTemplateRoutes,
    leaveRouter as leaveRoutes,
} from './modules/leave/index.js';
import { notificationRoutes } from './modules/notifications/index.js';
import { reportRoutes } from './modules/reports/index.js';
import sitesRoutes from './modules/sites/index.js';
import { lineRoutes } from './modules/line/index.js';

// Create Express app
const app: Application = express();

// Trust proxy for Vercel/Heroku/etc.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
    cors({
        origin: env.CORS_ORIGIN.split(','),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
    })
);

// Rate limiting - disabled in development
if (env.NODE_ENV === 'production') {
    const limiter = rateLimit({
        windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS),
        max: parseInt(env.RATE_LIMIT_MAX),
        message: {
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests, please try again later',
                message_th: 'มีคำขอมากเกินไป กรุณาลองใหม่ภายหลัง',
            },
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use(limiter);
    console.log('[App] Rate limiting enabled (production mode)');
} else {
    console.log('[App] Rate limiting disabled (development mode)');
}

// Body parsing
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.request(req.method, req.path, res.statusCode, duration);
    });
    next();
});

// Basic health check endpoint
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: env.API_VERSION,
        environment: env.NODE_ENV,
    });
});

// Debug endpoint (non-production only) - shows env config status
app.get('/debug/env', (_req, res) => {
    if (env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' });
    }
    res.json({
        NODE_ENV: env.NODE_ENV,
        hasSupabaseUrl: !!env.SUPABASE_URL,
        supabaseUrlPrefix: env.SUPABASE_URL?.substring(0, 30) + '...',
        hasServiceRoleKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
        serviceRoleKeyPrefix: env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...',
        hasAnonKey: !!env.SUPABASE_ANON_KEY,
        hasJwtSecret: !!env.JWT_SECRET,
        corsOrigin: env.CORS_ORIGIN,
    });
});

// API routes
const apiRouter = express.Router();

// Mount API routes
app.use(`/api/${env.API_VERSION}`, apiRouter);

// Health check routes (database, storage)
apiRouter.use('/health', healthRoutes);

// Sprint 1: Authentication & Company Setup
apiRouter.use('/auth', authRoutes);
apiRouter.use('/link-requests', linkRequestsRoutes);
apiRouter.use('/companies', companyRoutes);

// Sprint 2: Employee Management
apiRouter.use('/users', userRoutes);
apiRouter.use('/employees', employeeRoutes);

// Sprint 3: Shift Scheduling
apiRouter.use('/shifts', shiftRoutes);

// Sprint 4: Attendance (Clock In/Out)
apiRouter.use('/attendance', attendanceRoutes);

// Sprint 5: Leave Management
apiRouter.use('/leave-types', leaveTypeRoutes);
apiRouter.use('/leave-requests', leaveRequestRoutes);
apiRouter.use('/leave-balances', leaveBalanceRoutes);
apiRouter.use('/leave-templates', leaveTemplateRoutes);
apiRouter.use('/leave', leaveRoutes);


// Sprint 6: Notifications & Reports
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/reports', reportRoutes);

// Sites & Zones
apiRouter.use('/sites', sitesRoutes);

// LINE Integration
apiRouter.use('/line', lineRoutes);

// API root info
apiRouter.get('/', (_req, res) => {
    res.json({
        message: 'Security Guard HRM API',
        version: env.API_VERSION,
        documentation: '/api/v1/docs',
        endpoints: {
            auth: {
                register: 'POST /api/v1/auth/register',
                login: 'POST /api/v1/auth/login',
                lineLogin: 'POST /api/v1/auth/line',
                refresh: 'POST /api/v1/auth/refresh',
                logout: 'POST /api/v1/auth/logout',
                me: 'GET /api/v1/auth/me',
            },
            companies: {
                list: 'GET /api/v1/companies',
                current: 'GET /api/v1/companies/current',
                getById: 'GET /api/v1/companies/:id',
                settings: 'GET/PUT /api/v1/companies/:id/settings',
            },
            health: '/api/v1/health/db',
            tables: '/api/v1/health/tables',
            storage: '/api/v1/health/storage',
        },
    });
});

// 404 handler
app.use(notFoundMiddleware);

// Sentry error handler (must be before your own error handler)
Sentry.setupExpressErrorHandler(app);

// Error handler (must be last)
app.use(errorMiddleware);

export default app;
