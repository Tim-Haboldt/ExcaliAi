import { test, expect } from "@playwright/test";
import { registerUser } from "./auth-helpers";
import {
    waitForCanvas,
    drawRectangle,
    getSceneElementCount,
} from "./canvas-helpers";
import { sendChatMessage, waitForUserMessage } from "./chat-helpers";

function uniqueUsername(label: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    return `t-${label}-${timestamp}-${random}`;
}

async function setupSharedProject(
    browser: import("@playwright/test").Browser,
): Promise<{
    pageA: import("@playwright/test").Page;
    pageB: import("@playwright/test").Page;
    contextA: import("@playwright/test").BrowserContext;
    contextB: import("@playwright/test").BrowserContext;
    usernameA: string;
    usernameB: string;
}> {
    const usernameA = uniqueUsername("collabA");
    const usernameB = uniqueUsername("collabB");

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

    const acceptButton = pageB.getByTitle("Accept");
    await expect(acceptButton.first()).toBeVisible({ timeout: 10_000 });
    await acceptButton.first().click();

    await pageB.waitForTimeout(2_000);

    const sharedProject = pageB.locator("nav button", {
        hasText: "Project",
    });
    await expect(sharedProject).toHaveCount(2, { timeout: 5_000 });

    await sharedProject.nth(1).click();
    await pageB.waitForTimeout(1_000);

    return { pageA, pageB, contextA, contextB, usernameA, usernameB };
}

test.describe("Collaboration", () => {
    test("presence indicator shows collaborator", async ({ browser }) => {
        const { pageA, pageB, contextA, contextB, usernameB } =
            await setupSharedProject(browser);

        await waitForCanvas(pageA);
        await waitForCanvas(pageB);

        await pageA.waitForTimeout(3_000);

        const presenceIndicator = pageA.locator("div", {
            hasText: `${usernameB} is here`,
        });
        await expect(presenceIndicator.first()).toBeVisible({
            timeout: 10_000,
        });

        await contextA.close();
        await contextB.close();
    });

    test("canvas changes sync between users", async ({ browser }) => {
        const { pageA, pageB, contextA, contextB } =
            await setupSharedProject(browser);

        await waitForCanvas(pageA);
        await waitForCanvas(pageB);

        await pageA.waitForTimeout(2_000);

        await drawRectangle(pageA, 200, 200, 150, 100);
        await pageA.waitForTimeout(500);

        const elementCountA = await getSceneElementCount(pageA);
        expect(elementCountA).toBeGreaterThan(0);

        await pageB.waitForTimeout(5_000);

        const elementCountB = await getSceneElementCount(pageB);
        expect(elementCountB).toBeGreaterThan(0);

        await contextA.close();
        await contextB.close();
    });

    test("chat messages sync between users", async ({ browser }) => {
        const { pageA, pageB, contextA, contextB } =
            await setupSharedProject(browser);

        await waitForCanvas(pageA);
        await waitForCanvas(pageB);

        await pageA.waitForTimeout(2_000);

        await pageA.route("**/api/chat", (route) =>
            route.abort("connectionrefused"),
        );
        await pageB.route("**/api/chat", (route) =>
            route.abort("connectionrefused"),
        );

        await sendChatMessage(pageA, "Hello from user A!");
        await waitForUserMessage(pageA, "Hello from user A!");

        const remoteChatMessage = pageB.locator("div", {
            hasText: "Hello from user A!",
        });
        await expect(remoteChatMessage.first()).toBeVisible({
            timeout: 10_000,
        });

        await contextA.close();
        await contextB.close();
    });
});
