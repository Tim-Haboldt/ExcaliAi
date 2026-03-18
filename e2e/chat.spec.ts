import { test, expect } from "./fixtures/authenticated-page";
import {
    sendChatMessage,
    waitForUserMessage,
    mockChatTextResponse,
    mockChatToolCallResponse,
} from "./chat-helpers";
import { waitForCanvas, getSceneElementCount } from "./canvas-helpers";

test.describe("Chat", () => {
    test("send a chat message", async ({ authenticatedPage }) => {
        await waitForCanvas(authenticatedPage);

        await sendChatMessage(authenticatedPage, "Hello, can you help me?");

        await waitForUserMessage(authenticatedPage, "Hello, can you help me?");
    });

    test("receive mocked AI text response", async ({ authenticatedPage }) => {
        await waitForCanvas(authenticatedPage);

        await mockChatTextResponse(
            authenticatedPage,
            "Sure! I can help you with your canvas.",
        );

        await sendChatMessage(authenticatedPage, "Help me draw something");

        await waitForUserMessage(authenticatedPage, "Help me draw something");

        const assistantMessage = authenticatedPage.locator("div", {
            hasText: "Sure! I can help you with your canvas.",
        });
        await expect(assistantMessage.first()).toBeVisible({ timeout: 10_000 });
    });

    test("AI tool call updates canvas via mock", async ({
        authenticatedPage,
    }) => {
        await waitForCanvas(authenticatedPage);

        const initialCount = await getSceneElementCount(authenticatedPage);

        await mockChatToolCallResponse(
            authenticatedPage,
            "updateCanvas",
            {
                elements: [
                    {
                        id: "test-element-001",
                        type: "rectangle",
                        x: 100,
                        y: 100,
                        width: 200,
                        height: 150,
                        strokeColor: "#000000",
                        backgroundColor: "#ffffff",
                        fillStyle: "solid",
                        strokeWidth: 2,
                        roughness: 1,
                        opacity: 100,
                    },
                ],
                appState: {},
            },
            { success: true },
            "I've added a rectangle to your canvas.",
        );

        await sendChatMessage(authenticatedPage, "Draw a rectangle");

        await authenticatedPage.waitForTimeout(3_000);

        const toolStatus = authenticatedPage.locator("div", {
            hasText: "Canvas updated",
        });
        await expect(toolStatus.first()).toBeVisible({ timeout: 10_000 });
    });

    test("Ask AI quick prompt sends message to chat", async ({
        authenticatedPage,
    }) => {
        await waitForCanvas(authenticatedPage);

        await mockChatTextResponse(
            authenticatedPage,
            "I'll help improve your canvas.",
        );

        const askAiButton = authenticatedPage.getByRole("button", {
            name: /Ask AI/,
        });
        await askAiButton.click();

        const promptTextarea = authenticatedPage.getByPlaceholder(
            "e.g. Make this more modern...",
        );
        await expect(promptTextarea).toBeVisible();

        await promptTextarea.fill("Make the design more colorful");
        await promptTextarea.press("Enter");

        await waitForUserMessage(
            authenticatedPage,
            "Make the design more colorful",
        );
    });
});
