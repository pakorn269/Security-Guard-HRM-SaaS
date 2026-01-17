// Test setup file for frontend
import '@testing-library/jest-dom';
import { beforeAll, afterAll, afterEach } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => { },
    }),
});

beforeAll(() => {
    // Setup before all tests
});

afterEach(() => {
    // Cleanup after each test
});

afterAll(() => {
    // Cleanup after all tests
});
