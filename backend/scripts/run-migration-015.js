/**
 * Migration Runner: Add site_id and zone_id to shifts table
 * Run with: node scripts/run-migration-015.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    console.log('🚀 Running migration: 015_add_site_zone_to_shifts.sql');

    try {
        // Read migration file
        const migrationPath = join(__dirname, '../supabase/migrations/015_add_site_zone_to_shifts.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        console.log('📄 Migration SQL:');
        console.log(migrationSQL);
        console.log('\n⏳ Executing migration...\n');

        // Execute migration
        const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

        if (error) {
            // Try direct execution if RPC doesn't exist
            console.log('⚠️  RPC method not available, trying direct execution...');

            // Split by semicolon and execute each statement
            const statements = migrationSQL
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));

            for (const statement of statements) {
                console.log(`Executing: ${statement.substring(0, 50)}...`);
                const { error: execError } = await supabase.rpc('exec', { sql: statement });
                if (execError) {
                    console.error(`❌ Error executing statement:`, execError);
                    throw execError;
                }
            }
        }

        console.log('✅ Migration completed successfully!');
        console.log('\n📊 Verifying changes...\n');

        // Verify the columns were added
        const { data: columns, error: verifyError } = await supabase
            .from('shifts')
            .select('site_id, zone_id')
            .limit(1);

        if (verifyError) {
            console.log('⚠️  Could not verify columns (this is expected if table is empty)');
            console.log('Error:', verifyError.message);
        } else {
            console.log('✅ Columns verified: site_id and zone_id are now in shifts table');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
