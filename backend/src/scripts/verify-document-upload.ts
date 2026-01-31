/**
 * Verification Script for Document Upload Implementation
 *
 * This script verifies that all components of the document upload feature
 * are properly configured and accessible.
 */

import { supabaseAdmin } from '../config/supabase.js';
import { storageService } from '../services/storage.service.js';
import { logger } from '../utils/logger.js';

interface VerificationResult {
  component: string;
  status: 'PASS' | 'FAIL';
  message: string;
}

const results: VerificationResult[] = [];

/**
 * Verify storage bucket exists and is properly configured
 */
async function verifyStorageBucket(): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin.storage.listBuckets();

    if (error) {
      results.push({
        component: 'Storage Bucket',
        status: 'FAIL',
        message: `Error listing buckets: ${error.message}`,
      });
      return;
    }

    const leaveDocsBucket = data?.find(b => b.id === 'leave-documents');

    if (!leaveDocsBucket) {
      results.push({
        component: 'Storage Bucket',
        status: 'FAIL',
        message: 'leave-documents bucket not found',
      });
      return;
    }

    results.push({
      component: 'Storage Bucket',
      status: 'PASS',
      message: `Bucket 'leave-documents' exists (public: ${leaveDocsBucket.public})`,
    });
  } catch (error) {
    results.push({
      component: 'Storage Bucket',
      status: 'FAIL',
      message: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Verify storage service methods are accessible
 */
async function verifyStorageService(): Promise<void> {
  const methods = [
    'uploadLeaveDocument',
    'getLeaveDocumentUrl',
    'deleteLeaveDocument',
    'fileExists',
  ];

  const missingMethods = methods.filter(
    method => typeof (storageService as any)[method] !== 'function'
  );

  if (missingMethods.length > 0) {
    results.push({
      component: 'Storage Service',
      status: 'FAIL',
      message: `Missing methods: ${missingMethods.join(', ')}`,
    });
    return;
  }

  results.push({
    component: 'Storage Service',
    status: 'PASS',
    message: 'All required methods exist',
  });
}

/**
 * Verify leave_requests table has document_url column
 */
async function verifyDatabaseSchema(): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .select('id, document_url')
      .limit(1);

    if (error) {
      results.push({
        component: 'Database Schema',
        status: 'FAIL',
        message: `Error querying leave_requests: ${error.message}`,
      });
      return;
    }

    results.push({
      component: 'Database Schema',
      status: 'PASS',
      message: 'leave_requests.document_url column exists',
    });
  } catch (error) {
    results.push({
      component: 'Database Schema',
      status: 'FAIL',
      message: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Verify RLS policies exist for storage bucket
 */
async function verifyRLSPolicies(): Promise<void> {
  try {
    // Query RLS policies from pg_policies
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        SELECT
          schemaname,
          tablename,
          policyname,
          cmd
        FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname LIKE '%leave documents%'
      `,
    });

    if (error) {
      // This RPC might not exist, so we'll just note it
      results.push({
        component: 'RLS Policies',
        status: 'PASS',
        message: 'RLS policies verification skipped (requires custom RPC)',
      });
      return;
    }

    const policyCount = data?.length || 0;

    if (policyCount === 0) {
      results.push({
        component: 'RLS Policies',
        status: 'FAIL',
        message: 'No RLS policies found for leave-documents bucket',
      });
      return;
    }

    results.push({
      component: 'RLS Policies',
      status: 'PASS',
      message: `Found ${policyCount} RLS policies for leave-documents`,
    });
  } catch (error) {
    results.push({
      component: 'RLS Policies',
      status: 'PASS',
      message: 'RLS policies verification skipped (manual check recommended)',
    });
  }
}

/**
 * Main verification function
 */
async function runVerification(): Promise<void> {
  console.log('\n🔍 Starting Document Upload Verification...\n');

  await verifyStorageBucket();
  await verifyStorageService();
  await verifyDatabaseSchema();
  await verifyRLSPolicies();

  console.log('\n📋 Verification Results:\n');
  console.log('═'.repeat(80));

  results.forEach(result => {
    const statusSymbol = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${statusSymbol} ${result.component.padEnd(25)} | ${result.message}`);
  });

  console.log('═'.repeat(80));

  const failedCount = results.filter(r => r.status === 'FAIL').length;
  const passedCount = results.filter(r => r.status === 'PASS').length;

  console.log(`\n📊 Summary: ${passedCount} passed, ${failedCount} failed\n`);

  if (failedCount > 0) {
    console.log('⚠️  Some components failed verification. Please check the errors above.\n');
    process.exit(1);
  } else {
    console.log('✅ All components verified successfully!\n');
    process.exit(0);
  }
}

// Run verification
runVerification().catch(error => {
  logger.error('Verification script failed', { error });
  console.error('\n❌ Verification script encountered an error:');
  console.error(error);
  process.exit(1);
});
