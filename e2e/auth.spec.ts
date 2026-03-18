import { test, expect } from "@playwright/test";
import { registerUser, loginUser, logout } from "./auth-helpers";

function uniqueUsername(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    return `test-${timestamp}-${random}`;
}

test.describe("Authentication", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
    });

    test("register a new user", async ({ page }) => {
        const username = uniqueUsername();
        await registerUser(page, username);

        await expect(page.locator(".excalidraw")).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Sign out" }),
        ).toBeVisible();
    });

    test("login with existing user", async ({ page }) => {
        const username = uniqueUsername();

        await registerUser(page, username);
        await logout(page);
        await loginUser(page, username);

        await expect(page.locator(".excalidraw")).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Sign out" }),
        ).toBeVisible();
    });

    test("logout returns to auth form", async ({ page }) => {
        const username = uniqueUsername();
        await registerUser(page, username);

        await logout(page);

        await expect(page.getByText("Welcome back")).toBeVisible();
        await expect(page.getByLabel("Username")).toBeVisible();
    });

    test("reject short username on register", async ({ page }) => {
        await page.getByRole("button", { name: "Register" }).click();

        const usernameInput = page.getByLabel("Username");
        await usernameInput.fill("ab");

        const submitButton = page.getByRole("button", {
            name: "Create account",
        });
        await expect(submitButton).toBeDisabled();
    });

    test("reject duplicate username on register", async ({ page }) => {
        const username = uniqueUsername();

        await registerUser(page, username);
        await logout(page);

        await page.getByRole("button", { name: "Register" }).click();
        await page.getByLabel("Username").fill(username);
        await page.getByRole("button", { name: "Create account" }).click();

        const errorMessage = page.locator(".text-red-600, .dark\\:text-red-400");
        await expect(errorMessage).toBeVisible({ timeout: 5_000 });
        await expect(errorMessage).toContainText("taken");
    });
});
