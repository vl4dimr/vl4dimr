/** Registro personal de viajes, racha e insignias. Todo vive solo en el dispositivo. */
import type { Ciclo, Ruta } from "./esquema";
import { proximaSalida, salidasDeHoy, type SalidaFechada } from "./horario";
import { diaSemana, sumarDias, type FechaISO } from "./tiempo";

export interface Viaje {
  fecha: FechaISO;
  minutos: number;
  ruta: string;
  franja: string | null;
}

const CLAVE = "ec:viajes";
const MAXIMO = 500;

export function leerViajes(): Viaje[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as Viaje[]).filter((x) => typeof x?.fecha === "string" && typeof x?.minutos === "number") : [];
  } catch {
    return [];
  }
}

const mismo = (a: Viaje, b: Viaje): boolean => a.fecha === b.fecha && a.minutos === b.minutos && a.ruta === b.ruta;
export const yaRegistrado = (viajes: Viaje[], v: Viaje): boolean => viajes.some((x) => mismo(x, v));

export function agregarViaje(viajes: Viaje[], v: Viaje): Viaje[] {
  return yaRegistrado(viajes, v) ? viajes : [...viajes, v].slice(-MAXIMO);
}
export function guardarViajes(viajes: Viaje[]): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(viajes));
  } catch {
    /* almacenamiento no disponible */
  }
}

const esHabil = (f: FechaISO): boolean => diaSemana(f) >= 1 && diaSemana(f) <= 5;

/**
 * Días de servicio seguidos con al menos un viaje, contando hacia atrás desde hoy.
 * Los días sin servicio (fines de semana, feriados) no rompen la racha, y hoy
 * tampoco la rompe si todavía no se ha viajado.
 */
export function racha(viajes: Viaje[], hoy: FechaISO, hayServicio: (f: FechaISO) => boolean = esHabil): number {
  const dias = new Set(viajes.map((v) => v.fecha));
  let n = 0;
  let dia = hoy;
  if (!dias.has(dia)) dia = sumarDias(dia, -1);
  for (let i = 0; i < 400; i++, dia = sumarDias(dia, -1)) {
    if (dias.has(dia)) n++;
    else if (hayServicio(dia)) break;
  }
  return n;
}

export interface Insignia {
  id: string;
  nombre: string;
  detalle: string;
  lograda: boolean;
  /** Avance hacia la meta, de 0 a 1. */
  avance: number;
}

export function insignias(viajes: Viaje[], hoy: FechaISO, hayServicio?: (f: FechaISO) => boolean): Insignia[] {
  const total = viajes.length;
  const en = (franja: string): number => viajes.filter((v) => v.franja === franja).length;
  const porDia = new Map<FechaISO, Set<string>>();
  for (const v of viajes) porDia.set(v.fecha, (porDia.get(v.fecha) ?? new Set()).add(v.ruta));
  const idaYVuelta = [...porDia.values()].some((r) => r.size >= 2) ? 1 : 0;
  // La racha más larga alcanzada alguna vez, no solo la vigente.
  const mejor = Math.max(0, ...[...porDia.keys()].map((f) => racha(viajes.filter((v) => v.fecha <= f), f, hayServicio)), racha(viajes, hoy, hayServicio));
  const meta = (id: string, nombre: string, detalle: string, valor: number, objetivo: number): Insignia => ({
    id, nombre, detalle, lograda: valor >= objetivo, avance: Math.min(valor / objetivo, 1),
  });
  return [
    meta("primero", "Primer viaje", "Registre su primer viaje", total, 1),
    meta("diez", "Pasajero frecuente", "10 viajes registrados", total, 10),
    meta("cincuenta", "Leyenda del bus", "50 viajes registrados", total, 50),
    meta("madrugador", "Madrugador", "5 viajes en la franja de la mañana", en("Mañana"), 5),
    meta("nocturno", "Búho", "5 viajes en la franja de la noche", en("Noche"), 5),
    meta("ida-vuelta", "Ida y vuelta", "Viaje en las dos direcciones el mismo día", idaYVuelta, 1),
    meta("semana", "Semana completa", "Racha de 5 días de servicio", mejor, 5),
    meta("mes", "Imparable", "Racha de 20 días de servicio", mejor, 20),
  ];
}

/** Minutos antes de la salida en que ya se puede marcar «Voy en este bus». */
export const VENTANA_ABORDAJE_MIN = 10;

export interface EnCamino {
  salida: SalidaFechada;
  /** Avance estimado del viaje, de 0 a 1, según el horario (no es GPS). */
  progreso: number;
}

/** Bus que, según el horario, va en camino en este momento. */
export function busEnCamino(ciclo: Ciclo, ruta: Ruta, ahora: Date): EnCamino | null {
  const t = ahora.getTime();
  const s = salidasDeHoy(ciclo, ruta, ahora).filter((x) => x.instante.getTime() <= t && t < x.llegada.getTime()).at(-1);
  if (!s) return null;
  return { salida: s, progreso: (t - s.instante.getTime()) / (s.llegada.getTime() - s.instante.getTime()) };
}

/** Salida que se puede registrar ahora: la que va en camino o la que sale dentro de la ventana de abordaje. */
export function salidaAbordable(ciclo: Ciclo, ruta: Ruta, ahora: Date): SalidaFechada | null {
  const p = proximaSalida(ciclo, ruta, ahora);
  if (p && p.instante.getTime() - ahora.getTime() <= VENTANA_ABORDAJE_MIN * 60_000) return p;
  return busEnCamino(ciclo, ruta, ahora)?.salida ?? null;
}

export interface Consejo {
  /** Salida que todavía se alcanza caminando. */
  salida: SalidaFechada;
  /** Segundos que faltan para tener que salir hacia la parada (0 = salga ya). */
  salirEn: number;
  /** true si la próxima salida ya no se alcanza y se propone la siguiente. */
  perdioLaProxima: boolean;
}

/** Qué bus se alcanza si se tarda `minutosALaParada` en llegar a la parada. */
export function consejoDeSalida(ciclo: Ciclo, ruta: Ruta, ahora: Date, minutosALaParada: number): Consejo | null {
  const margen = minutosALaParada * 60_000;
  const proxima = proximaSalida(ciclo, ruta, ahora);
  const alcanzable = proximaSalida(ciclo, ruta, new Date(ahora.getTime() + margen));
  if (!proxima || !alcanzable) return null;
  return {
    salida: alcanzable,
    salirEn: Math.max(0, (alcanzable.instante.getTime() - margen - ahora.getTime()) / 1000),
    perdioLaProxima: alcanzable.instante.getTime() !== proxima.instante.getTime(),
  };
}
