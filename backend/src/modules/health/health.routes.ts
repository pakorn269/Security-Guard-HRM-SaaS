import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import logger from '../../utils/logger.js';

const router = Router();

/**
 * @route   GET /api/v1/health/db
 * @desc    Test database connection
 * @access  Public
 */
router.get('/db', async (_req: Request, res: Response) => {
  try {
    const startTime = Date.now();

    // Test query - get current timestamp from database
    const { data, error } = await supabaseAdmin.rpc('now').single();

    const latency = Date.now() - startTime;

    if (error) {
      logger.error('Database connection failed', error);
      return sendError(res, 'DB_CONNECTION_FAILED', 'Database connection failed', 503);
    }

    // Check if tables exist
        const { error: tablesError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .limit(1);

    const tablesExist = !tablesError;

    return sendSuccess(res, {
      status: 'connected',
      database: {
        timestamp: data,
        latency: `${latency}ms`,
        tablesExist,
        provider: 'Supabase',
      },
    });
  } catch (error) {
    logger.error('Database health check failed', error);
    return sendError(res, 'DB_HEALTH_CHECK_FAILED', 'Database health check failed', 500);
  }
});

/**
 * @route   GET /api/v1/health/tables
 * @desc    Check if all required tables exist
 * @access  Public
 */
router.get('/tables', async (_req: Request, res: Response) => {
  try {
    const requiredTables = [
      'companies',
      'users',
      'employees',
      'certifications',
      'shift_templates',
      'shifts',
      'attendance_logs',
      'leave_types',
      'leave_requests',
      'leave_balances',
      'notifications',
    ];

    const tableStatus: Record<string, boolean> = {};
    let allTablesExist = true;

    const checkTablePromises = requiredTables.map(async (table) => {
      const { error } = await supabaseAdmin.from(table).select('id').limit(1);
      return { table, exists: !error };
    });

    const results = await Promise.all(checkTablePromises);

    results.forEach(({ table, exists }) => {
      tableStatus[table] = exists;
      if (!exists) allTablesExist = false;
    });

    return sendSuccess(res, {
      allTablesExist,
      tables: tableStatus,
      totalTables: requiredTables.length,
      existingTables: Object.values(tableStatus).filter(Boolean).length,
    });
  } catch (error) {
    logger.error('Table check failed', error);
    return sendError(res, 'TABLE_CHECK_FAILED', 'Table check failed', 500);
  }
});

/**
 * @route   GET /api/v1/health/storage
 * @desc    Check if storage buckets exist
 * @access  Public
 */
router.get('/storage', async (_req: Request, res: Response) => {
  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();

    if (error) {
      logger.error('Storage check failed', error);
      return sendError(res, 'STORAGE_CHECK_FAILED', 'Storage check failed', 503);
    }

    const requiredBuckets = ['profile-images', 'company-logos', 'documents'];
    const existingBuckets = buckets?.map((b) => b.name) || [];

    const bucketStatus: Record<string, boolean> = {};
    for (const bucket of requiredBuckets) {
      bucketStatus[bucket] = existingBuckets.includes(bucket);
    }

    return sendSuccess(res, {
      allBucketsExist: requiredBuckets.every((b) => existingBuckets.includes(b)),
      buckets: bucketStatus,
      totalBuckets: existingBuckets.length,
    });
  } catch (error) {
    logger.error('Storage health check failed', error);
    return sendError(res, 'STORAGE_HEALTH_CHECK_FAILED', 'Storage health check failed', 500);
  }
});

export default router;
