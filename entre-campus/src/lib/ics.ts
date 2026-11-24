/** Exportación del horario de una ruta a iCalendar (.ics). Funciones puras. */
import type { Ciclo, GrupoDias, Ruta } from "./esquema";
import { grupoDeDia, salidasDeFranja } from "./horario";
import { aMinutos, formatoHora, sumarDias, ZONA, type FechaISO } from "./tiempo";

const BYDAY: Record<GrupoDias, string> = { "lunes-viernes": "MO,TU,WE,TH,FR", sabado: "SA", domingo: "SU" };

const esc = (s: string): string => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
const compacta = (f: FechaISO): string => f.replaceAll("-", "");
const local = (f: FechaISO, min: number): string =>
  `${compacta(f)}T${String(Math.floor(min / 60)).padStart(2, "0")}${String(min % 60).padStart(2, "0")}00`;

/** Pliega líneas a 75 octetos como pide el RFC 5545. */
function plegar(linea: string): string {
  const enc = new TextEncoder();
  const partes: string[] = [];
  let actual = "";
  let bytes = 0;
  for (const ch of linea) {
    const n = enc.encode(ch).length;
    if (bytes + n > (partes.length ? 74 : 75)) {
      partes.push(actual);
      actual = "";
      bytes = 0;
    }
    actual += ch;
    bytes += n;
  }
  partes.push(actual);
  return partes.join("\r\n ");
}

function primerDia(ciclo: Ciclo, grupo: GrupoDias): FechaISO | null {
  for (let d = ciclo.vigencia.inicio, i = 0; d <= ciclo.vigencia.fin && i < 7; d = sumarDias(d, 1), i++) {
    if (grupoDeDia(d) === grupo) return d;
  }
  return null;
}

export function generarICS(ciclo: Ciclo, ruta: Ruta, sello = new Date()): string {
  const dtstamp = sello.toISOString().replace(/[-:]|\.\d{3}/g, "");
  // Fin del último día del ciclo en hora de Costa Rica, expresado en UTC.
  const hasta = `${compacta(sumarDias(ciclo.vigencia.fin, 1))}T055959Z`;
  const l: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Entre Campus//Bus interno UNA (no oficial)//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`Bus UNA · ${ruta.origen} → ${ruta.destino}`)}`,
    `X-WR-TIMEZONE:${ZONA}`,
    "BEGIN:VTIMEZONE",
    `TZID:${ZONA}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0600",
    "TZOFFSETTO:-0600",
    "TZNAME:CST",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
  for (const grupo of Object.keys(ruta.franjas) as GrupoDias[]) {
    const dia = primerDia(ciclo, grupo);
    if (!dia) continue;
    const exactas = ruta.salidasExactas?.[grupo]?.map(aMinutos);
    const excluidas = ciclo.excepciones
      .map((e) => e.fecha)
      .filter((f) => f >= ciclo.vigencia.inicio && f <= ciclo.vigencia.fin && grupoDeDia(f) === grupo);
    for (const [i, f] of (ruta.franjas[grupo] ?? []).entries()) {
      const ini = aMinutos(f.inicio);
      const fin = aMinutos(f.fin);
      const salidas = exactas ? exactas.filter((m) => m >= ini && m <= fin) : salidasDeFranja(f);
      l.push(
        "BEGIN:VEVENT",
        `UID:${ciclo.ciclo}-${ruta.id}-${grupo}-${i}@entre-campus`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;TZID=${ZONA}:${local(dia, ini)}`,
        `DTEND;TZID=${ZONA}:${local(dia, fin)}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[grupo]};UNTIL=${hasta}`,
        ...(excluidas.length ? [`EXDATE;TZID=${ZONA}:${excluidas.map((d) => local(d, ini)).join(",")}`] : []),
        `SUMMARY:${esc(`Bus UNA · ${f.nombre} (${ruta.origen} → ${ruta.destino})`)}`,
        `LOCATION:${esc(ruta.origen)}`,
        `DESCRIPTION:${esc(
          `Salidas: ${salidas.map(formatoHora).join(", ")}.\nViaje estimado: ${ruta.duracionEstimadaMin} min.\n` +
            `Ciclo ${ciclo.ciclo}. Fuente: ${ciclo.fuente}.\nProyecto independiente, no oficial de la UNA.`,
        )}`,
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      );
    }
  }
  l.push("END:VCALENDAR");
  return l.map(plegar).join("\r\n") + "\r\n";
}

export function descargarICS(ciclo: Ciclo, ruta: Ruta): void {
  const url = URL.createObjectURL(new Blob([generarICS(ciclo, ruta)], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `bus-una-${ruta.id}-${ciclo.ciclo}.ics`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
