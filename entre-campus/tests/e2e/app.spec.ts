import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Fechas dentro del ciclo de ejemplo III-2026 (16 nov 2026 – 5 feb 2027), en hora de Costa Rica.
const MIERCOLES_NOCHE = "2026-11-25T18:10:00-06:00";
const en = (ahora: string, pagina = "") => `/?ahora=${encodeURIComponent(ahora)}#/${pagina}`;
const estado = (page: Page) => page.getByTestId("estado");

test.describe("pantalla principal", () => {
  test("muestra el estado, la próxima salida y la llegada estimada", async ({ page }) => {
    await page.goto(en(MIERCOLES_NOCHE));
    await expect(estado(page)).toHaveText("En servicio · franja Noche (hasta 8:00 p.m.)");
    await expect(page.getByTestId("proxima-hora")).toHaveText("6:30 p.m.");
    await expect(page.getByTestId("cuenta")).toHaveText(/Sale en 19 min \d\d s/);
    await expect(page.getByText("Llegada estimada a Campus Benjamín Núñez: 6:50 p.m.")).toBeVisible();
    await expect(page.getByTestId("restantes")).toHaveText("Quedan 4 salidas hoy.");
    await expect(page.locator(".franjas li[aria-current=time]")).toContainText("Noche");
    await expect(page.locator(".salidas li.pasada")).toHaveCount(13);
    await expect(page.getByText("Proyecto independiente y no oficial")).toBeVisible();
  });

  test("la cuenta regresiva avanza", async ({ page }) => {
    await page.goto(en(MIERCOLES_NOCHE));
    const cuenta = page.getByTestId("cuenta");
    const antes = await cuenta.textContent();
    await expect(cuenta).not.toHaveText(antes!, { timeout: 3000 });
  });

  test("recuerda la dirección elegida", async ({ page }) => {
    await page.goto(en(MIERCOLES_NOCHE));
    await expect(page.getByRole("radio", { name: /Omar Dengo hacia/ })).toBeChecked();
    await page.getByText("hacia Omar Dengo").click();
    await expect(page.getByRole("heading", { name: "Próxima salida desde Campus Benjamín Núñez" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("radio", { name: /Benjamín Núñez hacia/ })).toBeChecked();
  });

  test("entre franjas", async ({ page }) => {
    await page.goto(en("2026-11-25T09:30:00-06:00"));
    await expect(estado(page)).toHaveText("Fuera de servicio · próxima franja: Mediodía, 12:00 m.d.");
  });

  test("viernes en la noche vuelve el lunes", async ({ page }) => {
    await page.goto(en("2026-11-27T20:30:00-06:00"));
    await expect(estado(page)).toHaveText("El servicio vuelve el lunes a las 6:00 a.m.");
    await expect(page.getByTestId("proxima-hora")).toHaveText("6:00 a.m. · el lunes");
    await expect(page.getByTestId("restantes")).toHaveText("Ya no quedan salidas hoy.");
  });

  test("feriado", async ({ page }) => {
    await page.goto(en("2026-12-25T07:00:00-06:00"));
    await expect(estado(page)).toHaveText("Hoy no hay servicio: Navidad. El servicio vuelve el lunes a las 6:00 a.m.");
  });

  test("fuera de ciclo", async ({ page }) => {
    await page.goto(en("2027-02-06T07:00:00-06:00"));
    await expect(estado(page)).toHaveText("El ciclo terminó. Próximo horario: 15 de febrero de 2027");
  });

  test("pasa al siguiente ciclo cuando ya está vigente", async ({ page }) => {
    await page.goto(en("2027-02-15T06:10:00-06:00"));
    await expect(estado(page)).toHaveText("En servicio · franja Mañana (hasta 8:00 a.m.)");
    await expect(page.getByText("Ciclo I-2027 ·")).toBeVisible();
  });
});

test.describe("errores de carga", () => {
  test("muestra el error y permite reintentar", async ({ page }) => {
    let fallar = true;
    await page.route("**/data/index.json", (r) => (fallar ? r.abort() : r.continue()));
    await page.goto(en(MIERCOLES_NOCHE));
    await expect(page.getByRole("alert")).toContainText("No se pudo cargar el horario");
    fallar = false;
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(estado(page)).toContainText("En servicio");
  });

  test("se rinde a los 3 segundos", async ({ page }) => {
    await page.route("**/data/index.json", async (r) => {
      await new Promise((ok) => setTimeout(ok, 6000));
      await r.continue().catch(() => undefined);
    });
    await page.goto(en(MIERCOLES_NOCHE));
    const inicio = Date.now();
    await expect(page.getByRole("alert")).toContainText("La carga tardó demasiado", { timeout: 4500 });
    expect(Date.now() - inicio).toBeGreaterThan(2000);
  });

  test("rechaza datos que no cumplen el esquema", async ({ page }) => {
    await page.route("**/data/index.json", (r) => r.fulfill({ json: { activo: "X", ciclos: [] } }));
    await page.goto(en(MIERCOLES_NOCHE));
    await expect(page.getByRole("alert")).toContainText("No se pudo cargar el horario");
  });
});

test.describe("navegación y contenido", () => {
  test("el enlace «Ir al contenido» es lo primero al tabular", async ({ page }) => {
    await page.goto(en(MIERCOLES_NOCHE));
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Ir al contenido" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#contenido")).toBeFocused();
    await expect(estado(page)).toBeVisible();
  });

  test("horarios lista las salidas y exporta .ics", async ({ page }) => {
    await page.goto(en(MIERCOLES_NOCHE, "horarios"));
    await expect(page.getByRole("heading", { level: 1, name: "Horarios" })).toBeVisible();
    await expect(page.getByRole("row", { name: /Mediodía/ })).toContainText("12:00 m.d. · 12:30 p.m.");
    const descarga = page.waitForEvent("download");
    await page.getByRole("button", { name: /Exportar a calendario/ }).click();
    const archivo = await descarga;
    expect(archivo.suggestedFilename()).toBe("bus-una-od-bn-III-2026.ics");
  });

  test("paradas muestra el mapa y la marca de verificación", async ({ page }) => {
    await page.route("https://tile.openstreetmap.org/**", (r) => r.abort());
    await page.goto(en(MIERCOLES_NOCHE, "paradas"));
    await expect(page.locator(".leaflet-marker-icon")).toHaveCount(2);
    await expect(page.locator(".marca-verif")).toHaveText(["Sin verificar", "Sin verificar"]);
    await page.getByRole("button", { name: "Ver en el mapa" }).first().click();
    await expect(page.locator(".leaflet-popup")).toContainText("Ubicación sin verificar");
  });

  test("una notificación abre la app en su ruta", async ({ page }) => {
    await page.goto(`/?ahora=${encodeURIComponent(MIERCOLES_NOCHE)}#/?ruta=bn-od`);
    await expect(page.getByRole("radio", { name: /Benjamín Núñez hacia/ })).toBeChecked();
  });

  test("cambia de tema y lo recuerda", async ({ page }) => {
    await page.goto(en(MIERCOLES_NOCHE));
    await page.getByRole("button", { name: /^Tema: automático/ }).click();
    await page.getByRole("button", { name: /^Tema: claro/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-tema", "oscuro");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-tema", "oscuro");
  });
});

test.describe("accesibilidad (axe, WCAG 2.2 AA)", () => {
  const paginas = ["", "horarios", "paradas", "avisos", "mas", "instalar", "notificaciones", "acerca"];
  for (const tema of ["light", "dark"] as const) {
    for (const p of paginas) {
      test(`/${p} en tema ${tema}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: tema });
        await page.route("https://tile.openstreetmap.org/**", (r) => r.abort());
        await page.goto(en(MIERCOLES_NOCHE, p));
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        if (p !== "mas" && p !== "instalar") await expect(page.locator(".cargando")).toHaveCount(0);
        if (p === "paradas") await expect(page.locator(".leaflet-marker-icon")).toHaveCount(2);
        const r = await new AxeBuilder({ page: page as never })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
          .analyze();
        expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
      });
    }
  }
});
