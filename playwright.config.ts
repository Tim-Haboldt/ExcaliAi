import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    timeout: 60_000,
    expect: { timeout: 10_000 },

    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,

    reporter: process.env.CI ? "dot" : "list",

    use: {
        baseURL: "http://localhost:3000",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
    },

    projects: [
        {
            name: "firefox",
            use: { browserName: "firefox" },
        },
    ],

    webServer: [
        {
            command: "pnpm dev:next",
            url: "http://localhost:3000",
            reuseExistingServer: true,
            timeout: 5_000,
        },
        {
            command: "pnpm dev:socket",
            port: 3001,
            reuseExistingServer: true,
            timeout: 5_000,
        },
    ],
});
