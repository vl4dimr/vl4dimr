/**
 * Cálculos puros del horario. Reciben el instante "ahora" como parámetro y
 * trabajan siempre en hora de Costa Rica (ver tiempo.ts).
 */
import type { Aviso, Ciclo, Excepcion, Franja, GrupoDias, Indice, Ruta } from "./esquema";
import { aMinutos, diaSemana, instanteCR, partesCR, sumarDias, type FechaISO } from "./tiempo";

export interface Salida {
  /** Minutos desde la medianoche (hora de Costa Rica). */
  minutos: number;
  /** Nombre de la franja a la que pertenece, si cae dentro de alguna. */
  franja: string | null;
}

export interface SalidaFechada extends Salida {
  fecha: FechaISO;
  instante: Date;
  llegada: Date;
}

export interface InicioFranja {
  fecha: FechaISO;
  franja: Franja;
}

export type Estado =
  | { tipo: "en_servicio"; franja: Franja }
  | {
      tipo: "fuera";
      motivo: "entre_franjas" | "fin_del_dia" | "dia_sin_servicio" | "excepcion" | "antes_del_ciclo";
      excepcion?: Excepcion;
      /** Próximo inicio de franja dentro del ciclo; null si ya no queda ninguno. */
      siguiente: InicioFranja | null;
    }
  | { tipo: "ciclo_terminado" };

export function grupoDeDia(fecha: FechaISO): GrupoDias {
  const d = diaSemana(fecha);
  return d === 0 ? "domingo" : d === 6 ? "sabado" : "lunes-viernes";
}

export function enVigencia(ciclo: Ciclo, fecha: FechaISO): boolean {
  return fecha >= ciclo.vigencia.inicio && fecha <= ciclo.vigencia.fin;
}

export function excepcionDe(ciclo: Ciclo, fecha: FechaISO): Excepcion | undefined {
  return ciclo.excepciones.find((e) => e.fecha === fecha);
}

/** Franjas que operan en una fecha. Vacío si es feriado, fuera de vigencia o día sin servicio. */
export function franjasDe(ciclo: Ciclo, ruta: Ruta, fecha: FechaISO): Franja[] {
  if (!enVigencia(ciclo, fecha) || excepcionDe(ciclo, fecha)) return [];
  return ruta.franjas[grupoDeDia(fecha)] ?? [];
}

/** Franja que contiene el minuto dado: inicio incluido, fin excluido. */
export function franjaEn(franjas: readonly Franja[], minutos: number): Franja | undefined {
  return franjas.find((f) => minutos >= aMinutos(f.inicio) && minutos < aMinutos(f.fin));
}

/** Salidas de una franja generadas por frecuencia. La última puede coincidir con la hora de fin. */
export function salidasDeFranja(franja: Franja): number[] {
  const out: number[] = [];
  for (let t = aMinutos(franja.inicio); t <= aMinutos(franja.fin); t += franja.frecuenciaMin) out.push(t);
  return out;
}

/** Todas las salidas de una fecha, en orden. Usa salidasExactas si existen para ese grupo de días. */
export function salidasDe(ciclo: Ciclo, ruta: Ruta, fecha: FechaISO): Salida[] {
  if (!enVigencia(ciclo, fecha) || excepcionDe(ciclo, fecha)) return [];
  const grupo = grupoDeDia(fecha);
  const franjas = ruta.franjas[grupo] ?? [];
  const exactas = ruta.salidasExactas?.[grupo];
  if (exactas) {
    return [...new Set(exactas.map(aMinutos))]
      .sort((a, b) => a - b)
      .map((minutos) => ({
        minutos,
        franja:
          franjas.find((f) => minutos >= aMinutos(f.inicio) && minutos <= aMinutos(f.fin))?.nombre ?? null,
      }));
  }
  return franjas.flatMap((f) => salidasDeFranja(f).map((minutos) => ({ minutos, franja: f.nombre })));
}

/** Próximo inicio de franja estrictamente posterior a (fecha, minutos), dentro del ciclo. */
export function proximaFranja(ciclo: Ciclo, ruta: Ruta, fecha: FechaISO, minutos: number): InicioFranja | null {
  let dia = fecha;
  let desde = minutos;
  if (dia < ciclo.vigencia.inicio) {
    dia = ciclo.vigencia.inicio;
    desde = -1;
  }
  for (; dia <= ciclo.vigencia.fin; dia = sumarDias(dia, 1), desde = -1) {
    const franja = franjasDe(ciclo, ruta, dia).find((f) => aMinutos(f.inicio) > desde);
    if (franja) return { fecha: dia, franja };
  }
  return null;
}

export function estadoServicio(ciclo: Ciclo, ruta: Ruta, ahora: Date): Estado {
  const { fecha, minutos } = partesCR(ahora);
  if (fecha > ciclo.vigencia.fin) return { tipo: "ciclo_terminado" };

  const siguiente = proximaFranja(ciclo, ruta, fecha, minutos);
  if (fecha < ciclo.vigencia.inicio) return { tipo: "fuera", motivo: "antes_del_ciclo", siguiente };

  const excepcion = excepcionDe(ciclo, fecha);
  if (excepcion) return { tipo: "fuera", motivo: "excepcion", excepcion, siguiente };

  const franjas = franjasDe(ciclo, ruta, fecha);
  const actual = franjaEn(franjas, minutos);
  if (actual) return { tipo: "en_servicio", franja: actual };

  // Último día del ciclo, ya sin franjas por delante.
  if (!siguiente) return { tipo: "ciclo_terminado" };
  if (franjas.length === 0) return { tipo: "fuera", motivo: "dia_sin_servicio", siguiente };
  return { tipo: "fuera", motivo: siguiente.fecha === fecha ? "entre_franjas" : "fin_del_dia", siguiente };
}

function fechar(ruta: Ruta, fecha: FechaISO, s: Salida): SalidaFechada {
  const instante = instanteCR(fecha, s.minutos);
  return { ...s, fecha, instante, llegada: new Date(instante.getTime() + ruta.duracionEstimadaMin * 60_000) };
}

/** Próxima salida (hoy o en los días siguientes del ciclo). Una salida en este mismo segundo cuenta. */
export function proximaSalida(ciclo: Ciclo, ruta: Ruta, ahora: Date): SalidaFechada | null {
  const hoy = partesCR(ahora).fecha;
  let dia = hoy < ciclo.vigencia.inicio ? ciclo.vigencia.inicio : hoy;
  for (; dia <= ciclo.vigencia.fin; dia = sumarDias(dia, 1)) {
    for (const s of salidasDe(ciclo, ruta, dia)) {
      const f = fechar(ruta, dia, s);
      if (f.instante.getTime() >= ahora.getTime()) return f;
    }
  }
  return null;
}

export interface SalidaDelDia extends SalidaFechada {
  pasada: boolean;
}

/** Salidas del día de `ahora`, marcando las que ya pasaron. */
export function salidasDeHoy(ciclo: Ciclo, ruta: Ruta, ahora: Date): SalidaDelDia[] {
  const { fecha } = partesCR(ahora);
  return salidasDe(ciclo, ruta, fecha).map((s) => {
    const f = fechar(ruta, fecha, s);
    return { ...f, pasada: f.instante.getTime() < ahora.getTime() };
  });
}

export function avisosActivos(ciclo: Ciclo, ahora: Date): Aviso[] {
  const { fecha } = partesCR(ahora);
  const peso = { critico: 0, advertencia: 1, info: 2 } as const;
  return ciclo.avisos
    .filter((a) => fecha >= a.desde && fecha <= a.hasta)
    .sort((a, b) => peso[a.nivel] - peso[b.nivel]);
}

/** Elige el ciclo vigente hoy; si ninguno lo está, el marcado como activo. */
export function elegirCiclo(indice: Indice, hoy: FechaISO): Indice["ciclos"][number] {
  const vigentes = indice.ciclos.filter((c) => hoy >= c.inicio && hoy <= c.fin);
  return (
    vigentes.find((c) => c.ciclo === indice.activo) ??
    vigentes[0] ??
    indice.ciclos.find((c) => c.ciclo === indice.activo)!
  );
}

export function proximoInicio(indice: Indice, despuesDe: FechaISO): FechaISO | null {
  return indice.ciclos.map((c) => c.inicio).filter((f) => f > despuesDe).sort()[0] ?? null;
}
