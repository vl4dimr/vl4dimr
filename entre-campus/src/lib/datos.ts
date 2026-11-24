/** Carga y validación de los datos de horario. */
import { z } from "zod";
import { Ciclo, Indice } from "./esquema";
import { elegirCiclo, proximoInicio } from "./horario";
import { partesCR, type FechaISO } from "./tiempo";

export const ESPERA_MS = 3000;
const CLAVE_COPIA = "ec:datos";

export interface Datos {
  ciclo: Ciclo;
  /** Inicio del siguiente ciclo publicado, si existe. */
  proximoCiclo: FechaISO | null;
  /** Momento (ms) en que estos datos se obtuvieron de la red. */
  obtenido: number;
  /** true si vienen de la copia local porque la red falló. */
  deCopia: boolean;
}

export class ErrorDeDatos extends Error {}

async function pedir<T>(url: string, esquema: z.ZodType<T>, espera: number): Promise<T> {
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort(), espera);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new ErrorDeDatos(`Respuesta ${r.status} al pedir ${url}`);
    const v = esquema.safeParse(await r.json());
    if (!v.success) throw new ErrorDeDatos(`Datos inválidos en ${url}: ${z.prettifyError(v.error)}`);
    return v.data;
  } catch (e) {
    if (e instanceof ErrorDeDatos) throw e;
    throw new ErrorDeDatos(ctrl.signal.aborted ? "La carga tardó demasiado" : "No se pudo conectar");
  } finally {
    clearTimeout(reloj);
  }
}

const Copia = z.object({ ciclo: Ciclo, proximoCiclo: z.string().nullable(), obtenido: z.number() });

function leerCopia(): Datos | null {
  try {
    const v = Copia.safeParse(JSON.parse(localStorage.getItem(CLAVE_COPIA) ?? "null"));
    return v.success ? { ...v.data, deCopia: true } : null;
  } catch {
    return null;
  }
}

export async function cargarDatos(base: string, ahora = new Date(), espera = ESPERA_MS): Promise<Datos> {
  try {
    const hoy = partesCR(ahora).fecha;
    const indice = await pedir(`${base}data/index.json`, Indice, espera);
    const ref = elegirCiclo(indice, hoy);
    const ciclo = await pedir(`${base}data/${ref.archivo}`, Ciclo, espera);
    const copia = leerCopia();
    // Sin conexión, el service worker responde desde su caché: conservamos la fecha original.
    const obtenido = navigator.onLine || !copia ? Date.now() : copia.obtenido;
    const datos = { ciclo, proximoCiclo: proximoInicio(indice, ciclo.vigencia.fin), obtenido };
    try {
      localStorage.setItem(CLAVE_COPIA, JSON.stringify(datos));
    } catch {
      /* almacenamiento no disponible */
    }
    return { ...datos, deCopia: false };
  } catch (e) {
    const copia = leerCopia();
    if (copia) return copia;
    throw e;
  }
}
