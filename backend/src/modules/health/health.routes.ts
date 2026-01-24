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


/**
 * @route   GET /api/v1/health/schema
 * @desc    Check for specific columns in key tables
 * @access  Public
 */
router.get('/schema', async (_req: Request, res: Response) => {
  try {
    // We can't easily query information_schema with supabase-js directly without RPC
    // So we'll try to select specific columns and catch errors

    const checkColumns = {
      users: [
        'pin_set_at',
        'pin_locked_until',
        'pin_attempts',
        'line_user_id',
        'line_linked_at',
        'reset_code_hash'
      ],
      employees: [
        'user_id',
        'line_user_id'
      ],
      line_link_requests: [
        'id' // Just check if table exists
      ],
      pin_reset_requests: [
        'id' // Just check if table exists
      ]
    };

    const results: Record<string, any> = {};

    for (const [table, columns] of Object.entries(checkColumns)) {
      const tableResults: Record<string, boolean> = {};

      // Check table existence first
      const { error: tableError } = await supabaseAdmin.from(table).select('id').limit(1);
      if (tableError) {
        results[table] = { exists: false, error: tableError.message };
        continue;
      }

      results[table] = { exists: true, columns: {} };

      // Check each column
      for (const col of columns) {
        const { error } = await supabaseAdmin.from(table).select(col).limit(1);
        results[table].columns[col] = !error;
      }
    }

    return sendSuccess(res, results);
  } catch (error) {
    logger.error('Schema check failed', error);
    return sendError(res, 'SCHEMA_CHECK_FAILED', 'Schema check failed', 500);
  }
});

export default router;
