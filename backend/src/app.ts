import express, { Application, json, urlencoded } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js';
import logger from './utils/logger.js';

// Route imports
import healthRoutes from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/index.js';
import { companyRoutes } from './modules/company/index.js';
import { userRoutes } from './modules/user/index.js';
import { employeeRoutes } from './modules/employee/index.js';
import { shiftRoutes } from './modules/shift/index.js';

// Create Express app
const app: Application = express();

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

// Rate limiting
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

// API routes
const apiRouter = express.Router();

// Mount API routes
app.use(`/api/${env.API_VERSION}`, apiRouter);

// Health check routes (database, storage)
apiRouter.use('/health', healthRoutes);

// Sprint 1: Authentication & Company Setup
apiRouter.use('/auth', authRoutes);
apiRouter.use('/companies', companyRoutes);

// Sprint 2: Employee Management
apiRouter.use('/users', userRoutes);
apiRouter.use('/employees', employeeRoutes);

// Sprint 3: Shift Scheduling
apiRouter.use('/shifts', shiftRoutes);

// TODO: Add module routes here in Sprint 4+
// apiRouter.use('/attendance', attendanceRoutes);
// apiRouter.use('/leave-types', leaveTypeRoutes);
// apiRouter.use('/leave-requests', leaveRequestRoutes);
// apiRouter.use('/notifications', notificationRoutes);
// apiRouter.use('/reports', reportRoutes);

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

// Error handler (must be last)
app.use(errorMiddleware);

export default app;
