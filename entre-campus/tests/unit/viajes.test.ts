import { describe, expect, it } from "vitest";
import { excepcionDe, franjasDe } from "../../src/lib/horario";
import { aHHMM } from "../../src/lib/tiempo";
import { agregarViaje, busEnCamino, consejoDeSalida, insignias, racha, salidaAbordable, type Viaje } from "../../src/lib/viajes";
import { ciclo, cr, ruta } from "./fixture";

const v = (fecha: string, franja = "Mañana", r = "od-bn", minutos = 360): Viaje => ({ fecha, minutos, ruta: r, franja });
const hayServicio = (f: string): boolean => franjasDe(ciclo, ruta, f).length > 0;

describe("racha", () => {
  it("cuenta días de servicio seguidos y hoy no la rompe si aún no viaja", () => {
    const viajes = [v("2027-03-01"), v("2027-03-02"), v("2027-03-03")];
    expect(racha(viajes, "2027-03-03")).toBe(3);
    expect(racha(viajes, "2027-03-04")).toBe(3);
    expect(racha(viajes, "2027-03-05")).toBe(0);
  });
  it("el fin de semana no la rompe", () => {
    const viajes = [v("2027-03-04"), v("2027-03-05"), v("2027-03-08")];
    expect(racha(viajes, "2027-03-08")).toBe(3);
    expect(racha(viajes.slice(0, 2), "2027-03-07")).toBe(2);
    expect(racha(viajes.slice(0, 2), "2027-03-08")).toBe(2);
  });
  it("los feriados tampoco la rompen", () => {
    // 25 y 26 de marzo son feriado en el ciclo de prueba.
    const viajes = [v("2027-03-24"), v("2027-03-29")];
    expect(racha(viajes, "2027-03-29", hayServicio)).toBe(2);
    expect(racha(viajes, "2027-03-29")).toBe(1);
    expect(excepcionDe(ciclo, "2027-03-25")).toBeDefined();
  });
  it("sin viajes es cero", () => expect(racha([], "2027-03-03")).toBe(0));
});

describe("registro e insignias", () => {
  it("no duplica el mismo viaje", () => {
    const uno = agregarViaje([], v("2027-03-01"));
    expect(agregarViaje(uno, v("2027-03-01"))).toHaveLength(1);
    expect(agregarViaje(uno, v("2027-03-01", "Noche", "bn-od", 1020))).toHaveLength(2);
  });
  it("calcula logros y avance", () => {
    const viajes = [v("2027-03-01"), v("2027-03-01", "Noche", "bn-od", 1020), v("2027-03-02"), v("2027-03-03"), v("2027-03-04"), v("2027-03-05")];
    const i = Object.fromEntries(insignias(viajes, "2027-03-20").map((x) => [x.id, x]));
    expect(i.primero!.lograda).toBe(true);
    expect(i["ida-vuelta"]!.lograda).toBe(true);
    expect(i.madrugador!.lograda).toBe(true);
    expect(i.semana!.lograda).toBe(true); // la racha ya se perdió, pero el logro queda
    expect(i.diez).toMatchObject({ lograda: false, avance: 0.6 });
    expect(i.nocturno!.avance).toBe(0.2);
  });
});

describe("bus en camino y abordaje", () => {
  it("estima el avance entre la salida y la llegada", () => {
    expect(busEnCamino(ciclo, ruta, cr("2027-03-03", "06:10"))).toMatchObject({ salida: { minutos: 360 }, progreso: 0.5 });
    expect(busEnCamino(ciclo, ruta, cr("2027-03-03", "06:20"))).toBeNull();
    expect(busEnCamino(ciclo, ruta, cr("2027-03-03", "09:30"))).toBeNull();
  });
  it("permite registrar desde 10 min antes y mientras va en camino", () => {
    const abordable = (h: string) => { const s = salidaAbordable(ciclo, ruta, cr("2027-03-03", h)); return s && aHHMM(s.minutos); };
    expect(abordable("05:49")).toBeNull();
    expect(abordable("05:50")).toBe("06:00");
    expect(abordable("06:05")).toBe("06:00");
    expect(abordable("06:21")).toBe("06:30");
    expect(abordable("09:30")).toBeNull();
  });
});

describe("consejo de salida", () => {
  const consejo = (h: string, min: number) => {
    const c = consejoDeSalida(ciclo, ruta, cr("2027-03-03", h), min)!;
    return [aHHMM(c.salida.minutos), c.salirEn / 60, c.perdioLaProxima];
  };
  it("dice cuándo salir hacia la parada", () => {
    expect(consejo("06:05", 10)).toEqual(["06:30", 15, false]);
    expect(consejo("06:20", 10)).toEqual(["06:30", 0, false]);
  });
  it("si ya no alcanza la próxima, propone la siguiente", () => {
    expect(consejo("06:21", 10)).toEqual(["07:00", 29, true]);
    expect(consejo("07:55", 10)).toEqual(["12:00", 235, true]);
  });
});
