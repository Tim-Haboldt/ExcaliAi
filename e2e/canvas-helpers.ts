import { type Page, expect } from "@playwright/test";

export async function waitForCanvas(page: Page) {
    await expect(page.locator(".excalidraw")).toBeVisible({ timeout: 15_000 });
}

export async function drawRectangle(
    page: Page,
    startX: number,
    startY: number,
    width: number,
    height: number,
) {
    const canvas = page.locator(".excalidraw__canvas.interactive");
    await canvas.click();
    await page.keyboard.press("r");
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) {
        throw new Error("Canvas bounding box not found");
    }

    const absoluteStartX = canvasBox.x + startX;
    const absoluteStartY = canvasBox.y + startY;

    await page.mouse.move(absoluteStartX, absoluteStartY);
    await page.mouse.down();
    await page.mouse.move(absoluteStartX + width, absoluteStartY + height, {
        steps: 5,
    });
    await page.mouse.up();
}

export async function getSceneElementCount(page: Page): Promise<number> {
    return page.evaluate(() => {
        const api = window.__EXCALIDRAW_API__;
        if (!api) {
            return 0;
        }

        return api.getSceneElements().length;
    });
}

export async function getSceneElementTypes(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const api = window.__EXCALIDRAW_API__;
        if (!api) {
            return [];
        }

        return api.getSceneElements().map((element) => element.type);
    });
}
