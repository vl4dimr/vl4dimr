/** Helpers de tiempo en la zona horaria de Costa Rica. Nunca usan la zona del dispositivo. */

export const ZONA = "America/Costa_Rica";

/** Fecha civil "AAAA-MM-DD". */
export type FechaISO = string;

export interface AhoraCR {
  fecha: FechaISO;
  /** Minutos desde la medianoche en Costa Rica (0–1439). */
  minutos: number;
  segundos: number;
  /** 0 = domingo … 6 = sábado. */
  diaSemana: number;
}

const fmtPartes = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Descompone un instante en fecha y hora de Costa Rica. */
export function partesCR(instante: Date): AhoraCR {
  const p: Record<string, string> = {};
  for (const { type, value } of fmtPartes.formatToParts(instante)) p[type] = value;
  const fecha = `${p.year}-${p.month}-${p.day}`;
  return {
    fecha,
    minutos: Number(p.hour) * 60 + Number(p.minute),
    segundos: Number(p.second),
    diaSemana: diaSemana(fecha),
  };
}

/** Día de la semana de una fecha civil (0 = domingo). */
export function diaSemana(fecha: FechaISO): number {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay();
}

export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Días civiles de `a` hasta `b` (positivo si b es posterior). */
export function diasEntre(a: FechaISO, b: FechaISO): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Instante real correspondiente a una fecha y hora de Costa Rica. */
export function instanteCR(fecha: FechaISO, minutos: number): Date {
  const supuesto = Date.parse(`${fecha}T00:00:00Z`) + minutos * 60_000;
  // Corrige con el desfase real de la zona (en CR es fijo, pero no lo damos por hecho).
  const p = partesCR(new Date(supuesto));
  const visto = Date.parse(`${p.fecha}T00:00:00Z`) + p.minutos * 60_000;
  return new Date(supuesto + (supuesto - visto));
}

/** "06:30" → 390 */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":");
  return Number(h) * 60 + Number(m);
}

/** 390 → "06:30" */
export function aHHMM(minutos: number): string {
  const h = Math.floor(minutos / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

/** 360 → "6:00 a.m." · 720 → "12:00 m.d." · 1200 → "8:00 p.m." */
export function formatoHora(minutos: number): string {
  const m = ((minutos % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const sufijo = m === 720 ? "m.d." : h24 < 12 ? "a.m." : "p.m.";
  return `${h12}:${mm} ${sufijo}`;
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre",
];

export function nombreDia(fecha: FechaISO): string {
  return DIAS[diaSemana(fecha)]!;
}

/** "2027-03-01" → "1 de marzo de 2027" */
export function formatoFecha(fecha: FechaISO): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return `${d} de ${MESES[m! - 1]} de ${a}`;
}

/** "lunes 1 de marzo" */
export function formatoFechaConDia(fecha: FechaISO): string {
  const [, m, d] = fecha.split("-").map(Number);
  return `${nombreDia(fecha)} ${d} de ${MESES[m! - 1]}`;
}

/** Cómo nombrar un día futuro respecto a hoy: "hoy", "mañana", "el lunes", "el lunes 8 de marzo". */
export function diaRelativo(hoy: FechaISO, fecha: FechaISO): string {
  const n = diasEntre(hoy, fecha);
  if (n === 0) return "hoy";
  if (n === 1) return "mañana";
  if (n === -1) return "ayer";
  if (n > 1 && n < 7) return `el ${nombreDia(fecha)}`;
  return `el ${formatoFechaConDia(fecha)}`;
}

/** Cuenta regresiva: 3725 s → "1 h 02 min" · 125 s → "2 min 05 s" · 9 s → "9 s" */
export function formatoCuenta(segundosTotales: number): string {
  const s = Math.max(0, Math.floor(segundosTotales));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d} d ${h % 24} h`;
  }
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
  if (m > 0) return `${m} min ${String(seg).padStart(2, "0")} s`;
  return `${seg} s`;
}
