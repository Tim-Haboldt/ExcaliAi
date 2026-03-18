import { test, expect } from "@playwright/test";
import { registerUser } from "./auth-helpers";

function uniqueUsername(label: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    return `t-${label}-${timestamp}-${random}`;
}

test.describe("Invitations", () => {
    test("invite a user to a project", async ({ browser }) => {
        const usernameA = uniqueUsername("inviter");
        const usernameB = uniqueUsername("invitee");

        const contextA = await browser.newContext();
        const contextB = await browser.newContext();
        const pageA = await contextA.newPage();
        const pageB = await contextB.newPage();

        await pageA.goto("/");
        await registerUser(pageA, usernameA);

        await pageB.goto("/");
        await registerUser(pageB, usernameB);

        await pageA.waitForTimeout(2_000);

        const inviteButton = pageA.getByTitle("Invite collaborator").first();
        await inviteButton.click({ force: true });

        await expect(
            pageA.getByText("Invite Collaborator"),
        ).toBeVisible();

        const inviteInput = pageA.getByPlaceholder("Enter username...");
        await inviteInput.fill(usernameB);
        await pageA.getByRole("button", { name: "Send Invite" }).click();

        await expect(
            pageA.getByText(`Invitation sent to ${usernameB}`),
        ).toBeVisible({ timeout: 10_000 });

        await pageA.getByRole("button", { name: "Close" }).click();

        await pageB.reload();
        await expect(pageB.locator(".excalidraw")).toBeVisible({
            timeout: 15_000,
        });

        const invitationFromA = pageB.locator("div", {
            hasText: usernameA,
        });
        await expect(invitationFromA.first()).toBeVisible({ timeout: 10_000 });

        await contextA.close();
        await contextB.close();
    });

    test("accept invitation adds project", async ({ browser }) => {
        const usernameA = uniqueUsername("inviter");
        const usernameB = uniqueUsername("invitee");

        const contextA = await browser.newContext();
        const contextB = await browser.newContext();
        const pageA = await contextA.newPage();
        const pageB = await contextB.newPage();

        await pageA.goto("/");
        await registerUser(pageA, usernameA);

        await pageB.goto("/");
        await registerUser(pageB, usernameB);

        await pageA.waitForTimeout(2_000);

        const inviteButton = pageA.getByTitle("Invite collaborator").first();
        await inviteButton.click({ force: true });
        await pageA.getByPlaceholder("Enter username...").fill(usernameB);
        await pageA.getByRole("button", { name: "Send Invite" }).click();
        await expect(
            pageA.getByText(`Invitation sent to ${usernameB}`),
        ).toBeVisible({ timeout: 10_000 });
        await pageA.getByRole("button", { name: "Close" }).click();

        await pageB.reload();
        await expect(pageB.locator(".excalidraw")).toBeVisible({
            timeout: 15_000,
        });

        const projectCountBefore = await pageB
            .locator("nav button", { hasText: "Project" })
            .count();

        const acceptButton = pageB.getByTitle("Accept");
        await expect(acceptButton.first()).toBeVisible({ timeout: 10_000 });
        await acceptButton.first().click();

        await pageB.waitForTimeout(2_000);

        const projectCountAfter = await pageB
            .locator("nav button", { hasText: "Project" })
            .count();
        expect(projectCountAfter).toBeGreaterThan(projectCountBefore);

        await contextA.close();
        await contextB.close();
    });

    test("decline invitation removes it", async ({ browser }) => {
        const usernameA = uniqueUsername("inviter");
        const usernameB = uniqueUsername("invitee");

        const contextA = await browser.newContext();
        const contextB = await browser.newContext();
        const pageA = await contextA.newPage();
        const pageB = await contextB.newPage();

        await pageA.goto("/");
        await registerUser(pageA, usernameA);

        await pageB.goto("/");
        await registerUser(pageB, usernameB);

        await pageA.waitForTimeout(2_000);

        const inviteButton = pageA.getByTitle("Invite collaborator").first();
        await inviteButton.click({ force: true });
        await pageA.getByPlaceholder("Enter username...").fill(usernameB);
        await pageA.getByRole("button", { name: "Send Invite" }).click();
        await expect(
            pageA.getByText(`Invitation sent to ${usernameB}`),
        ).toBeVisible({ timeout: 10_000 });
        await pageA.getByRole("button", { name: "Close" }).click();

        await pageB.reload();
        await expect(pageB.locator(".excalidraw")).toBeVisible({
            timeout: 15_000,
        });

        const declineButton = pageB.getByTitle("Decline");
        await expect(declineButton.first()).toBeVisible({ timeout: 10_000 });

        const projectCountBefore = await pageB
            .locator("nav button", { hasText: "Project" })
            .count();

        await declineButton.first().click();

        await pageB.waitForTimeout(2_000);

        const projectCountAfter = await pageB
            .locator("nav button", { hasText: "Project" })
            .count();
        expect(projectCountAfter).toBe(projectCountBefore);

        await expect(declineButton).toHaveCount(0, { timeout: 5_000 });

        await contextA.close();
        await contextB.close();
    });
});
