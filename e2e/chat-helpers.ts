import type { Page, Route } from "@playwright/test";

export async function sendChatMessage(page: Page, message: string) {
    const composer = page.getByPlaceholder("Type a message…");
    await composer.fill(message);
    await composer.press("Enter");
}

export async function waitForUserMessage(page: Page, text: string) {
    const messageLocator = page
        .locator(".bg-zinc-900.text-zinc-50")
        .filter({ hasText: text });

    await messageLocator.waitFor({ timeout: 5_000 });
}

export async function waitForAssistantMessage(page: Page, text: string) {
    const messageLocator = page
        .locator(".bg-zinc-100, .dark\\:bg-zinc-900")
        .filter({ hasText: text });

    await messageLocator.waitFor({ timeout: 10_000 });
}

function sseEvent(data: string): string {
    return `data: ${data}\n\n`;
}

function buildUIMessageStream(parts: StreamPart[]): string {
    const chunks: string[] = [];

    chunks.push(sseEvent(JSON.stringify({ type: "start", messageId: "msg-test-001" })));

    for (const part of parts) {
        switch (part.type) {
            case "text": {
                const textId = `text-${Math.random().toString(36).substring(2, 8)}`;
                chunks.push(sseEvent(JSON.stringify({ type: "text-start", id: textId })));
                chunks.push(sseEvent(JSON.stringify({ type: "text-delta", id: textId, delta: part.text })));
                chunks.push(sseEvent(JSON.stringify({ type: "text-end", id: textId })));
                break;
            }
            case "tool-call": {
                chunks.push(sseEvent(JSON.stringify({
                    type: "tool-input-start",
                    toolCallId: part.toolCallId,
                    toolName: part.toolName,
                })));
                chunks.push(sseEvent(JSON.stringify({
                    type: "tool-input-available",
                    toolCallId: part.toolCallId,
                    toolName: part.toolName,
                    input: part.args,
                })));
                break;
            }
            case "tool-result": {
                chunks.push(sseEvent(JSON.stringify({
                    type: "tool-output-available",
                    toolCallId: part.toolCallId,
                    output: part.result,
                })));
                break;
            }
        }
    }

    chunks.push(sseEvent(JSON.stringify({ type: "finish" })));
    chunks.push(sseEvent("[DONE]"));

    return chunks.join("");
}

type StreamPart =
    | { type: "text"; text: string }
    | {
          type: "tool-call";
          toolCallId: string;
          toolName: string;
          args: Record<string, unknown>;
      }
    | {
          type: "tool-result";
          toolCallId: string;
          result: Record<string, unknown>;
      };

export async function mockChatTextResponse(page: Page, responseText: string) {
    await page.route("**/api/chat", async (route: Route) => {
        const body = buildUIMessageStream([{ type: "text", text: responseText }]);

        await route.fulfill({
            status: 200,
            contentType: "text/event-stream",
            headers: {
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "x-vercel-ai-ui-message-stream": "v1",
            },
            body,
        });
    });
}

export async function mockChatToolCallResponse(
    page: Page,
    toolName: string,
    toolArgs: Record<string, unknown>,
    toolResult: Record<string, unknown>,
    textBefore?: string,
) {
    await page.route("**/api/chat", async (route: Route) => {
        const parts: StreamPart[] = [];

        if (textBefore) {
            parts.push({ type: "text", text: textBefore });
        }

        parts.push({
            type: "tool-call",
            toolCallId: "call_test_001",
            toolName,
            args: toolArgs,
        });
        parts.push({
            type: "tool-result",
            toolCallId: "call_test_001",
            result: toolResult,
        });

        const body = buildUIMessageStream(parts);

        await route.fulfill({
            status: 200,
            contentType: "text/event-stream",
            headers: {
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "x-vercel-ai-ui-message-stream": "v1",
            },
            body,
        });
    });
}
