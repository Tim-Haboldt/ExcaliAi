import { test as base, type Page } from "@playwright/test";
import { registerUser } from "../auth-helpers";

function generateTestUsername(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    return `test-${timestamp}-${random}`;
}

type AuthenticatedFixtures = {
    authenticatedPage: Page;
    username: string;
};

export const test = base.extend<AuthenticatedFixtures>({
    username: async ({}, use) => {
        await use(generateTestUsername());
    },

    authenticatedPage: async ({ page, username }, use) => {
        await page.goto("/");
        await registerUser(page, username);
        await use(page);
    },
});

export { expect } from "@playwright/test";
