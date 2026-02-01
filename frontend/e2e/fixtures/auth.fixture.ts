import { test as base } from '@playwright/test';

// Define custom fixtures
type AuthFixtures = {
    loginAsGuard: () => Promise<void>;
    loginAsManager: () => Promise<void>;
};

export const test = base.extend<AuthFixtures>({
    loginAsGuard: async ({ page }, use) => {
        // Define the fixture
        const login = async () => {
            // Mock auth state or perform actual login
            // For now, we'll bypass assuming a "dev login" or similar if available,
            // or just simulate the sequence if we have a real backend running.
            // Since we don't have a guarantee of a running backend/database for this test run in the agent,
            // We will assume the app has a bypass or we mock the network requests.

            // OPTION: Mock the Supabase Auth session in localStorage/sessionStorage
            // This often works for Supabase apps if we know the shape of the token.

            await page.goto('/');

            // If there is a login form:
            // await page.getByLabel('Email').fill('guard@example.com');
            // await page.getByLabel('Password').fill('password');
            // await page.getByRole('button', { name: 'Sign in' }).click();
            // await page.waitForURL('/dashboard');

            // For fast e2e, we might mock network responses for auth check
        };
        await use(login);
    },
    loginAsManager: async ({ page }, use) => {
        const login = async () => {
            await page.goto('/');
            // TODO: Implement manager login
        };
        await use(login);
    },
});

export { expect } from '@playwright/test';
