import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4173",
    locale: "es-CR",
    // A propósito, una zona distinta a la de Costa Rica: la app no debe depender del dispositivo.
    timezoneId: "Asia/Tokyo",
    serviceWorkers: "block",
  },
  projects: [{ name: "movil", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
