import { test, expect } from "./fixtures/authenticated-page";

test.describe("Project Management", () => {
    test("default project exists on first login", async ({
        authenticatedPage,
    }) => {
        const projectItems = authenticatedPage.locator("nav button", {
            hasText: "Project",
        });

        await expect(projectItems.first()).toBeVisible();
    });

    test("create new project", async ({ authenticatedPage }) => {
        const newProjectButton = authenticatedPage.getByRole("button", {
            name: "+ New Project",
        });
        await newProjectButton.click();

        const projectItems = authenticatedPage.locator("nav button", {
            hasText: "Project",
        });
        await expect(projectItems).toHaveCount(2, { timeout: 5_000 });
    });

    test("switch between projects", async ({ authenticatedPage }) => {
        await authenticatedPage
            .getByRole("button", { name: "+ New Project" })
            .click();

        const projectItems = authenticatedPage.locator("nav button", {
            hasText: "Project",
        });
        await expect(projectItems).toHaveCount(2, { timeout: 5_000 });

        const firstProject = projectItems.first();
        const secondProject = projectItems.nth(1);

        await firstProject.click();
        const firstParent = firstProject.locator("..");
        await expect(firstParent).toHaveClass(/bg-zinc-200|dark:bg-zinc-800/);

        await secondProject.click();
        const secondParent = secondProject.locator("..");
        await expect(secondParent).toHaveClass(/bg-zinc-200|dark:bg-zinc-800/);
    });

    test("delete a project", async ({ authenticatedPage }) => {
        await authenticatedPage
            .getByRole("button", { name: "+ New Project" })
            .click();

        const projectItems = authenticatedPage.locator("nav button", {
            hasText: "Project",
        });
        await expect(projectItems).toHaveCount(2, { timeout: 5_000 });

        const deleteButton = authenticatedPage
            .getByTitle("Delete project")
            .first();
        await deleteButton.click({ force: true });

        await expect(projectItems).toHaveCount(1, { timeout: 5_000 });
    });
});
