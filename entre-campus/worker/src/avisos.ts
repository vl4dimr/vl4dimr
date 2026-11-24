/** Qué avisos tocan en un minuto dado. Función pura, compartida con las pruebas. */
import type { MensajePush, TipoAviso } from "../../src/lib/contrato";
import type { Ciclo } from "../../src/lib/esquema";
import { franjasDe, salidasDe } from "../../src/lib/horario";
import { aMinutos, formatoHora, partesCR } from "../../src/lib/tiempo";

export interface AvisoPendiente {
  ruta: string;
  tipo: TipoAviso;
  mensaje: MensajePush;
}

/**
 * Avisos que corresponden al minuto de `ahora` (hora de Costa Rica).
 * Respeta vigencia y excepciones porque salidasDe/franjasDe ya devuelven vacío en esos casos.
 */
export function avisosPendientes(ciclo: Ciclo, ahora: Date): AvisoPendiente[] {
  const { fecha, minutos } = partesCR(ahora);
  const out: AvisoPendiente[] = [];
  for (const ruta of ciclo.rutas) {
    const tramo = `${ruta.origen} → ${ruta.destino}`;
    for (const s of salidasDe(ciclo, ruta, fecha)) {
      for (const antes of [10, 5] as const) {
        if (s.minutos - minutos !== antes) continue;
        out.push({
          ruta: ruta.id,
          tipo: `salida${antes}`,
          mensaje: {
            titulo: `El bus sale en ${antes} min`,
            cuerpo: `Salida de las ${formatoHora(s.minutos)} · ${tramo}`,
            ruta: ruta.id,
            etiqueta: `${ruta.id}-${fecha}-${s.minutos}`,
          },
        });
      }
    }
    for (const f of franjasDe(ciclo, ruta, fecha)) {
      const inicio = aMinutos(f.inicio);
      if (inicio - minutos !== 10) continue;
      out.push({
        ruta: ruta.id,
        tipo: "franja10",
        mensaje: {
          titulo: `La franja de ${f.nombre} empieza en 10 min`,
          cuerpo: `Servicio de ${formatoHora(inicio)} a ${formatoHora(aMinutos(f.fin))} · ${tramo}`,
          ruta: ruta.id,
          etiqueta: `${ruta.id}-${fecha}-${inicio}`,
        },
      });
    }
  }
  return out;
}
