import { test, expect } from './fixtures/auth.fixture';

test.describe('Leave Workflow', () => {
    test.beforeEach(async ({ loginAsGuard }) => {
        // Scenario 1 starts with Guard login
        // We can override this in specific tests if needed
    });

    test('Scenario 1 (Guard): Login -> LIFF -> Submit Leave Request', async ({ loginAsGuard, page }) => {
        await loginAsGuard();

        // Navigate to LIFF Page (simulated or direct URL)
        await page.goto('/liff/leave');

        // Select Template
        // Assuming there is a template selector or button "Use Template"
        // Since Roadmap Task 2.4 mentioned it, assume it's present or we fallback to manual form.
        // If not present, we fill the form manually.
        const useTemplateBtn = page.getByRole('button', { name: /template|sick/i });
        if (await useTemplateBtn.isVisible()) {
            await useTemplateBtn.first().click();
        } else {
            // Manual fill
            await page.getByLabel(/Leave Type/i).click();
            await page.getByRole('option', { name: /Sick/i }).click(); // Select generic option
        }

        // Upload File
        // await page.getByLabel(/Upload/i).setInputFiles('e2e/fixtures/test-doc.pdf'); 
        // (Mock file needed)

        // Submit
        await page.getByRole('button', { name: /Submit|Request/i }).click();

        // Verify Success
        await expect(page.getByText(/Success|submitted/i)).toBeVisible();
    });

    test('Scenario 2 (Manager): Approve Request', async ({ loginAsManager, page }) => {
        await loginAsManager();
        await page.goto('/dashboard');

        // Find a pending request
        // This assumes data exists or we mocked the backend response for the E2E test
        // Playwright can route network requests:
        // await page.route('**/api/leave-requests', route => route.fulfill({ json: mocks.requests }));

        // Click Approve on first request
        await page.getByRole('button', { name: /Approve/i }).first().click();

        // In modal, Assign Replacement if prompted
        // await page.getByText(/Select Replacement/i).click(); ...

        // Confirm
        await page.getByRole('button', { name: /Confirm|Save/i }).click();

        // Verify Toast/Notification
        await expect(page.getByText(/Approved/i)).toBeVisible();
    });

    test('Scenario 3 (Localization): Switch Language', async ({ loginAsGuard, page }) => {
        await loginAsGuard();
        await page.goto('/liff/leave');

        // Switch to TH
        await page.getByRole('button', { name: /TH/i }).click();

        // Verify BE Year (e.g., 2569) or Thai text
        await expect(page.getByText(/ลา/i)).toBeVisible(); // 'La' (Leave) in Thai
        // Verify Calendar shows BE year?
        // const currentYearBE = new Date().getFullYear() + 543;
        // await expect(page.getByText(String(currentYearBE))).toBeVisible();
    });
});
