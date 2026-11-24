import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "allow" });

test("el manifest está completo", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const m = (await (await request.get(new URL(href!, page.url()).href)).json()) as {
    display: string; start_url: string; theme_color: string; lang: string;
    icons: { src: string; sizes: string; purpose?: string }[];
  };
  expect(m).toMatchObject({ display: "standalone", start_url: "./", theme_color: "#0b6e69", lang: "es-CR" });
  expect(m.icons.map((i) => `${i.sizes}${i.purpose ? " " + i.purpose : ""}`)).toEqual(
    expect.arrayContaining(["192x192", "512x512", "512x512 maskable"]),
  );
  for (const i of m.icons) expect((await request.get(`/${i.src}`)).ok()).toBe(true);
});

test("funciona sin conexión y lo indica", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByTestId("estado")).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((ok) => navigator.serviceWorker.addEventListener("controllerchange", ok, { once: true }));
    }
  });
  // Segunda visita con conexión: llena la caché de datos del service worker.
  await page.reload();
  await expect(page.getByTestId("estado")).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("estado")).toBeVisible();
  await expect(page.getByText(/Sin conexión · datos del \d+ de \w+ de \d{4}/)).toBeVisible();
  await page.getByRole("link", { name: "Horarios" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Horarios" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Mañana/ })).toBeVisible();
});
