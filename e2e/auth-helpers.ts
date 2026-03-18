import { type Page, expect } from "@playwright/test";

async function ensureProjectExists(page: Page) {
    const createButton = page.getByRole("button", {
        name: "Create your first project",
    });
    const canvas = page.locator(".excalidraw");

    const hasCanvas = await canvas.isVisible().catch(() => false);
    if (hasCanvas) {
        return;
    }

    const needsProject = await createButton.isVisible().catch(() => false);
    if (needsProject) {
        await createButton.click();
    }

    await expect(canvas).toBeVisible({ timeout: 15_000 });
}

export async function registerUser(page: Page, username: string) {
    const switchButton = page.getByRole("button", { name: "Register" });
    await switchButton.click();

    const usernameInput = page.getByLabel("Username");
    await usernameInput.fill(username);

    const submitButton = page.getByRole("button", { name: "Create account" });
    await submitButton.click();

    await expect(
        page.getByRole("button", { name: "Sign out" }),
    ).toBeVisible({ timeout: 10_000 });
    await ensureProjectExists(page);
}

export async function loginUser(page: Page, username: string) {
    const usernameInput = page.getByLabel("Username");
    await usernameInput.fill(username);

    const submitButton = page.getByRole("button", { name: "Sign in" });
    await submitButton.click();

    await expect(
        page.getByRole("button", { name: "Sign out" }),
    ).toBeVisible({ timeout: 10_000 });
    await ensureProjectExists(page);
}

export async function logout(page: Page) {
    const signOutButton = page.getByRole("button", { name: "Sign out" });
    await signOutButton.click();

    await expect(page.getByLabel("Username")).toBeVisible();
}
