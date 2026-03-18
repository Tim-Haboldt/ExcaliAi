import { test, expect } from "./fixtures/authenticated-page";
import {
    waitForCanvas,
    drawRectangle,
    getSceneElementCount,
    getSceneElementTypes,
} from "./canvas-helpers";

test.describe("Excalidraw Canvas", () => {
    test("canvas renders on project load", async ({ authenticatedPage }) => {
        await waitForCanvas(authenticatedPage);
        await expect(authenticatedPage.locator(".excalidraw")).toBeVisible();
    });

    test("draw a rectangle on the canvas", async ({ authenticatedPage }) => {
        await waitForCanvas(authenticatedPage);

        await drawRectangle(authenticatedPage, 200, 200, 150, 100);

        await authenticatedPage.waitForTimeout(500);

        const elementCount = await getSceneElementCount(authenticatedPage);
        expect(elementCount).toBeGreaterThan(0);

        const elementTypes = await getSceneElementTypes(authenticatedPage);
        expect(elementTypes).toContain("rectangle");
    });

    test("canvas persists after reload", async ({ authenticatedPage }) => {
        await waitForCanvas(authenticatedPage);

        await drawRectangle(authenticatedPage, 200, 200, 150, 100);
        await authenticatedPage.waitForTimeout(500);

        const elementCountBefore =
            await getSceneElementCount(authenticatedPage);
        expect(elementCountBefore).toBeGreaterThan(0);

        await authenticatedPage.evaluate(async () => {
            const excalidrawApi = window.__EXCALIDRAW_API__;
            if (!excalidrawApi) {
                throw new Error("Excalidraw API not available");
            }

            const elements = excalidrawApi
                .getSceneElements()
                .map((element) => JSON.parse(JSON.stringify(element)));
            const { viewBackgroundColor } = excalidrawApi.getAppState();

            const canvasData = {
                type: "excalidraw",
                version: 2,
                elements,
                appState: { viewBackgroundColor },
                files: {},
            };

            const projectsResponse = await fetch("/api/projects");
            const projectsData = await projectsResponse.json();
            const projectId = projectsData.projects[0].id;

            const saveResponse = await fetch(`/api/projects/${projectId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat: [],
                    canvas: canvasData,
                }),
            });

            if (!saveResponse.ok) {
                throw new Error(
                    `Save failed with status ${saveResponse.status}`,
                );
            }
        });

        await authenticatedPage.reload();
        await waitForCanvas(authenticatedPage);
        await authenticatedPage.waitForTimeout(2_000);

        const elementCountAfter = await getSceneElementCount(authenticatedPage);
        expect(elementCountAfter).toBe(elementCountBefore);
    });
});
