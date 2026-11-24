/** Textos de estado en español de Costa Rica (trato de usted). Funciones puras. */
import type { Ciclo } from "./esquema";
import type { Estado, InicioFranja } from "./horario";
import { aMinutos, diaRelativo, formatoFecha, formatoHora, partesCR, type FechaISO } from "./tiempo";

/** "a las 6:00 a.m." / "a la 1:00 p.m." */
export function aLas(minutos: number): string {
  const h = Math.floor(minutos / 60) % 12;
  return `${h === 1 ? "a la" : "a las"} ${formatoHora(minutos)}`;
}

function vuelve(hoy: FechaISO, s: InicioFranja): string {
  return `El servicio vuelve ${diaRelativo(hoy, s.fecha)} ${aLas(aMinutos(s.franja.inicio))}`;
}

export interface TextoEstado {
  activo: boolean;
  titulo: string;
  detalle: string;
}

export function textoEstado(
  estado: Estado,
  ciclo: Ciclo,
  ahora: Date,
  proximoCiclo: FechaISO | null = null,
): TextoEstado {
  const hoy = partesCR(ahora).fecha;
  if (estado.tipo === "en_servicio") {
    const f = estado.franja;
    return {
      activo: true,
      titulo: "En servicio",
      detalle: `franja ${f.nombre} (hasta ${formatoHora(aMinutos(f.fin))})`,
    };
  }
  if (estado.tipo === "ciclo_terminado") {
    return {
      activo: false,
      titulo: "El ciclo terminó",
      detalle: proximoCiclo
        ? `Próximo horario: ${formatoFecha(proximoCiclo)}`
        : "Próximo horario: aún sin publicar",
    };
  }
  const s = estado.siguiente;
  switch (estado.motivo) {
    case "entre_franjas":
      return {
        activo: false,
        titulo: "Fuera de servicio",
        detalle: `próxima franja: ${s!.franja.nombre}, ${formatoHora(aMinutos(s!.franja.inicio))}`,
      };
    case "excepcion":
      return {
        activo: false,
        titulo: `Hoy no hay servicio: ${estado.excepcion!.motivo}`,
        detalle: s ? vuelve(hoy, s) : "No quedan más días de servicio en este ciclo",
      };
    case "antes_del_ciclo":
      return {
        activo: false,
        titulo: `El ciclo ${ciclo.ciclo} aún no empieza`,
        detalle: s ? vuelve(hoy, s) : `Empieza el ${formatoFecha(ciclo.vigencia.inicio)}`,
      };
    default:
      return { activo: false, titulo: "Fuera de servicio", detalle: vuelve(hoy, s!) };
  }
}

/** Línea única para lectores de pantalla y pruebas: "En servicio · franja Noche (hasta 8:00 p.m.)" */
export function lineaEstado(t: TextoEstado): string {
  const fuera = t.titulo === "Fuera de servicio";
  if (fuera && t.detalle.startsWith("El servicio vuelve")) return t.detalle;
  return `${t.titulo}${fuera || t.activo ? " · " : ". "}${t.detalle}`;
}
