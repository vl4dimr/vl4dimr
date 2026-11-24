import { describe, expect, it } from "vitest";
import {
  avisosActivos, estadoServicio, franjasDe, proximaSalida, salidasDe, salidasDeHoy, type Estado,
} from "../../src/lib/horario";
import { lineaEstado, textoEstado } from "../../src/lib/textos";
import { aHHMM, partesCR } from "../../src/lib/tiempo";
import { ciclo, cr, ruta, rutaExacta } from "./fixture";

// Semana de referencia: lunes 2027-03-01 … domingo 2027-03-07.
const LUN = "2027-03-01", MIE = "2027-03-03", VIE = "2027-03-05", SAB = "2027-03-06", DOM = "2027-03-07", LUN2 = "2027-03-08";

const estado = (fecha: string, hora: string): Estado => estadoServicio(ciclo, ruta, cr(fecha, hora));
const linea = (fecha: string, hora: string, proximo: string | null = null): string => {
  const ahora = cr(fecha, hora);
  return lineaEstado(textoEstado(estadoServicio(ciclo, ruta, ahora), ciclo, ahora, proximo));
};
const proxima = (fecha: string, hora: string, r = ruta) => {
  const s = proximaSalida(ciclo, r, cr(fecha, hora));
  return s && `${s.fecha} ${aHHMM(s.minutos)}`;
};

describe("límites exactos de cada franja", () => {
  it.each([
    ["06:00", "Mañana"],
    ["12:00", "Mediodía"],
    ["17:00", "Noche"],
  ])("a las %s en punto empieza la franja %s", (hora, nombre) => {
    const e = estado(MIE, hora);
    expect(e).toMatchObject({ tipo: "en_servicio", franja: { nombre } });
  });

  it.each([
    ["05:59:59", "Mañana"],
    ["11:59:59", "Mediodía"],
    ["16:59:59", "Noche"],
  ])("a las %s todavía no está en servicio", (hora, nombre) => {
    expect(estado(MIE, hora)).toMatchObject({ tipo: "fuera", motivo: "entre_franjas", siguiente: { fecha: MIE, franja: { nombre } } });
  });

  it.each([
    ["07:59:59", "Mañana"],
    ["13:59:59", "Mediodía"],
    ["19:59:59", "Noche"],
  ])("a las %s sigue en la franja %s", (hora, nombre) => {
    expect(estado(MIE, hora)).toMatchObject({ tipo: "en_servicio", franja: { nombre } });
  });

  it("a las 8:00 en punto termina la Mañana y la próxima es Mediodía", () => {
    expect(estado(MIE, "08:00")).toMatchObject({ tipo: "fuera", motivo: "entre_franjas", siguiente: { fecha: MIE, franja: { nombre: "Mediodía" } } });
  });
  it("a las 14:00 en punto termina el Mediodía y la próxima es Noche", () => {
    expect(estado(MIE, "14:00")).toMatchObject({ tipo: "fuera", motivo: "entre_franjas", siguiente: { franja: { nombre: "Noche" } } });
  });
  it("a las 20:00 en punto termina la Noche y el servicio vuelve al día siguiente", () => {
    expect(estado(MIE, "20:00")).toMatchObject({ tipo: "fuera", motivo: "fin_del_dia", siguiente: { fecha: "2027-03-04", franja: { nombre: "Mañana" } } });
  });

  it("la salida de la hora de fin existe y cuenta como próxima en ese instante", () => {
    expect(proxima(MIE, "08:00")).toBe(`${MIE} 08:00`);
    expect(proxima(MIE, "08:00:01")).toBe(`${MIE} 12:00`);
    expect(proxima(MIE, "20:00")).toBe(`${MIE} 20:00`);
  });
});

describe("textos de estado", () => {
  it("en servicio", () => {
    expect(linea(MIE, "18:10")).toBe("En servicio · franja Noche (hasta 8:00 p.m.)");
    expect(linea(MIE, "06:00")).toBe("En servicio · franja Mañana (hasta 8:00 a.m.)");
  });
  it("entre franjas (9:30 → Mediodía)", () => {
    expect(linea(MIE, "09:30")).toBe("Fuera de servicio · próxima franja: Mediodía, 12:00 m.d.");
    expect(linea(MIE, "15:00")).toBe("Fuera de servicio · próxima franja: Noche, 5:00 p.m.");
    expect(linea(MIE, "04:00")).toBe("Fuera de servicio · próxima franja: Mañana, 6:00 a.m.");
  });
  it("después de las 8 p.m.", () => {
    expect(linea(MIE, "20:30")).toBe("El servicio vuelve mañana a las 6:00 a.m.");
  });
  it("viernes en la noche → lunes 6:00", () => {
    expect(estado(VIE, "20:01")).toMatchObject({ tipo: "fuera", motivo: "fin_del_dia", siguiente: { fecha: LUN2, franja: { inicio: "06:00" } } });
    expect(linea(VIE, "20:01")).toBe("El servicio vuelve el lunes a las 6:00 a.m.");
    expect(proxima(VIE, "20:01")).toBe(`${LUN2} 06:00`);
  });
  it("fin de semana", () => {
    expect(estado(SAB, "10:00")).toMatchObject({ tipo: "fuera", motivo: "dia_sin_servicio", siguiente: { fecha: LUN2 } });
    expect(linea(SAB, "10:00")).toBe("El servicio vuelve el lunes a las 6:00 a.m.");
    expect(linea(DOM, "23:59")).toBe("El servicio vuelve mañana a las 6:00 a.m.");
    expect(salidasDe(ciclo, ruta, SAB)).toEqual([]);
    expect(franjasDe(ciclo, ruta, DOM)).toEqual([]);
  });
});

describe("feriados y excepciones", () => {
  it("el día de la excepción no hay franjas ni salidas", () => {
    expect(salidasDe(ciclo, ruta, "2027-03-25")).toEqual([]);
    expect(estado("2027-03-25", "07:00")).toMatchObject({ tipo: "fuera", motivo: "excepcion", excepcion: { motivo: "Jueves Santo" }, siguiente: { fecha: "2027-03-29" } });
    expect(linea("2027-03-25", "07:00")).toBe("Hoy no hay servicio: Jueves Santo. El servicio vuelve el lunes a las 6:00 a.m.");
  });
  it("la noche anterior salta los feriados y el fin de semana", () => {
    expect(estado("2027-03-24", "21:00")).toMatchObject({ siguiente: { fecha: "2027-03-29" } });
    expect(linea("2027-03-24", "21:00")).toBe("El servicio vuelve el lunes a las 6:00 a.m.");
    expect(proxima("2027-03-24", "21:00")).toBe("2027-03-29 06:00");
  });
});

describe("vigencia del ciclo", () => {
  it("antes del inicio", () => {
    expect(estado("2027-02-10", "07:00")).toMatchObject({ tipo: "fuera", motivo: "antes_del_ciclo", siguiente: { fecha: "2027-02-15" } });
    expect(linea("2027-02-10", "07:00")).toBe("El ciclo I-2027 aún no empieza. El servicio vuelve el lunes a las 6:00 a.m.");
    expect(linea("2027-01-10", "07:00")).toBe("El ciclo I-2027 aún no empieza. El servicio vuelve el lunes 15 de febrero a las 6:00 a.m.");
    expect(proxima("2027-02-10", "07:00")).toBe("2027-02-15 06:00");
    expect(salidasDe(ciclo, ruta, "2027-02-12")).toEqual([]);
  });
  it("primer y último día están dentro", () => {
    expect(estado("2027-02-15", "06:00").tipo).toBe("en_servicio");
    expect(estado("2027-06-25", "19:59").tipo).toBe("en_servicio");
  });
  it("después de la última franja del último día, el ciclo terminó", () => {
    expect(estado("2027-06-25", "20:00").tipo).toBe("ciclo_terminado");
    expect(proxima("2027-06-25", "20:00")).toBe("2027-06-25 20:00");
    expect(proxima("2027-06-25", "20:00:01")).toBeNull();
  });
  it("después del fin", () => {
    expect(estado("2027-06-28", "07:00").tipo).toBe("ciclo_terminado");
    expect(linea("2027-06-28", "07:00", "2027-07-19")).toBe("El ciclo terminó. Próximo horario: 19 de julio de 2027");
    expect(linea("2027-06-28", "07:00")).toBe("El ciclo terminó. Próximo horario: aún sin publicar");
    expect(proxima("2027-06-28", "07:00")).toBeNull();
  });
});

describe("cambio de día a medianoche", () => {
  it("23:59:59 del lunes y 00:00:00 del martes apuntan a la misma salida", () => {
    expect(linea(LUN, "23:59:59")).toBe("El servicio vuelve mañana a las 6:00 a.m.");
    expect(linea("2027-03-02", "00:00")).toBe("Fuera de servicio · próxima franja: Mañana, 6:00 a.m.");
    expect(proxima(LUN, "23:59:59")).toBe("2027-03-02 06:00");
    expect(proxima("2027-03-02", "00:00")).toBe("2027-03-02 06:00");
  });
  it("las salidas del día se reinician tras la medianoche", () => {
    expect(salidasDeHoy(ciclo, ruta, cr(LUN, "23:59:59")).every((s) => s.pasada)).toBe(true);
    expect(salidasDeHoy(ciclo, ruta, cr("2027-03-02", "00:00")).some((s) => s.pasada)).toBe(false);
  });
  it("viernes 23:59:59 → sábado 00:00 sigue apuntando al lunes", () => {
    expect(proxima(VIE, "23:59:59")).toBe(`${LUN2} 06:00`);
    expect(proxima(SAB, "00:00")).toBe(`${LUN2} 06:00`);
  });
});

describe("salidas", () => {
  it("genera por frecuencia dentro de cada franja", () => {
    const hs = salidasDe(ciclo, ruta, MIE).map((s) => aHHMM(s.minutos));
    expect(hs).toEqual([
      "06:00", "06:30", "07:00", "07:30", "08:00",
      "12:00", "12:30", "13:00", "13:30", "14:00",
      "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00",
    ]);
  });
  it("usa salidasExactas cuando existen", () => {
    const ss = salidasDe(ciclo, rutaExacta, MIE);
    expect(ss.map((s) => aHHMM(s.minutos))).toEqual(["06:10", "07:40", "12:15", "19:55"]);
    expect(ss.map((s) => s.franja)).toEqual(["Mañana", "Mañana", "Mediodía", "Noche"]);
    expect(proxima(MIE, "07:41", rutaExacta)).toBe(`${MIE} 12:15`);
  });
  it("marca las pasadas y calcula la llegada estimada", () => {
    const hoy = salidasDeHoy(ciclo, ruta, cr(MIE, "12:10"));
    expect(hoy.filter((s) => s.pasada)).toHaveLength(6);
    const s = proximaSalida(ciclo, ruta, cr(MIE, "12:10"))!;
    expect(aHHMM(s.minutos)).toBe("12:30");
    expect(partesCR(s.llegada).minutos).toBe(12 * 60 + 50);
  });
});

describe("avisos", () => {
  it("filtra por fecha y ordena por gravedad", () => {
    expect(avisosActivos(ciclo, cr(MIE, "10:00")).map((a) => a.id)).toEqual(["a2", "a1"]);
    expect(avisosActivos(ciclo, cr(VIE, "23:59")).map((a) => a.id)).toEqual(["a1"]);
    expect(avisosActivos(ciclo, cr(SAB, "00:00"))).toEqual([]);
  });
});
