// Test setup file for backend
// Set dummy environment variables to satisfy env schema validation during tests
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://dummy-project-id.supabase.co';
process.env.SUPABASE_ANON_KEY = 'dummy-anon-key-that-is-long-enough-for-testing';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-service-role-key-that-is-long-enough-for-testing';
process.env.JWT_SECRET = 'dummy-jwt-secret-key-at-least-32-characters-long';

import { beforeAll, afterAll, afterEach } from 'vitest';

beforeAll(() => {
    // Setup before all tests
    process.env.NODE_ENV = 'test';
});

afterEach(() => {
    // Cleanup after each test
});

afterAll(() => {
    // Cleanup after all tests
});
