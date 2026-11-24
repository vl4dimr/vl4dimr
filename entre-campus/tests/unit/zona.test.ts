/**
 * Dispositivo configurado en otra zona horaria: se ejecuta el mismo escenario
 * en procesos hijos con distintos TZ y el resultado debe ser idéntico.
 */
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { formatoHora, instanteCR, partesCR } from "../../src/lib/tiempo";

const guion = `
import { estadoServicio, proximaSalida } from "./src/lib/horario.ts";
import { textoEstado, lineaEstado } from "./src/lib/textos.ts";
import { partesCR, instanteCR } from "./src/lib/tiempo.ts";
import { ciclo, ruta } from "./tests/unit/fixture.ts";
const out = [new Date().getTimezoneOffset()];
// Viernes 2027-03-05 20:01 en CR = sábado 02:01 UTC = sábado 11:01 en Tokio.
for (const iso of ["2027-03-06T02:01:00Z", "2027-03-03T12:00:00Z", "2027-03-02T05:59:59Z", "2027-03-02T06:00:00Z"]) {
  const ahora = new Date(iso);
  const s = proximaSalida(ciclo, ruta, ahora);
  out.push([partesCR(ahora), lineaEstado(textoEstado(estadoServicio(ciclo, ruta, ahora), ciclo, ahora)), s && s.instante.toISOString()]);
}
out.push(instanteCR("2027-03-01", 360).toISOString());
console.log(JSON.stringify(out));
`;

function correrEn(tz: string): unknown[] {
  const salida = execFileSync("npx", ["tsx", "-e", guion], { env: { ...process.env, TZ: tz }, encoding: "utf8" });
  return JSON.parse(salida) as unknown[];
}

describe("independencia de la zona horaria del dispositivo", () => {
  it("da el mismo resultado en Costa Rica, Tokio, Madrid, Auckland y Honolulu", () => {
    const [desfaseCR, ...esperado] = correrEn("America/Costa_Rica");
    expect(desfaseCR).toBe(360);
    expect(esperado[0]).toEqual([
      { fecha: "2027-03-05", minutos: 1201, segundos: 0, diaSemana: 5 },
      "El servicio vuelve el lunes a las 6:00 a.m.",
      "2027-03-08T12:00:00.000Z",
    ]);
    expect((esperado[1] as unknown[])[1]).toBe("En servicio · franja Mañana (hasta 8:00 a.m.)");
    for (const tz of ["Asia/Tokyo", "Europe/Madrid", "Pacific/Auckland", "Pacific/Honolulu"]) {
      const [desfase, ...resto] = correrEn(tz);
      expect(desfase).not.toBe(360);
      expect(resto).toEqual(esperado);
    }
  }, 60_000);
});

describe("tiempo.ts", () => {
  it("partesCR e instanteCR son inversas", () => {
    const d = instanteCR("2027-12-31", 23 * 60 + 59);
    expect(d.toISOString()).toBe("2028-01-01T05:59:00.000Z");
    expect(partesCR(d)).toMatchObject({ fecha: "2027-12-31", minutos: 1439, diaSemana: 5 });
  });
  it("formatea horas al estilo costarricense", () => {
    expect([0, 360, 720, 750, 780, 1200].map(formatoHora)).toEqual([
      "12:00 a.m.", "6:00 a.m.", "12:00 m.d.", "12:30 p.m.", "1:00 p.m.", "8:00 p.m.",
    ]);
  });
});
