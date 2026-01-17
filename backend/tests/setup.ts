// Test setup file for backend
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
