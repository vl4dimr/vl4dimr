/**
 * Worker de notificaciones de Entre Campus.
 *   POST /subscribe    guarda una suscripción push por ruta y tipo de aviso
 *   POST /unsubscribe  la elimina
 *   cron (cada minuto) envía los avisos que tocan en ese minuto
 */
import { PeticionDesuscribir, PeticionSuscribir, Suscripcion, type TipoAviso } from "../../src/lib/contrato";
import { Ciclo, Indice } from "../../src/lib/esquema";
import { elegirCiclo } from "../../src/lib/horario";
import { partesCR } from "../../src/lib/tiempo";
import { avisosPendientes } from "./avisos";
import { enviarPush, type Vapid } from "./webpush";

/** Parte de la API de Workers KV que usa este Worker (compatible con KVNamespace). */
export interface KV {
  get(clave: string, tipo: "json"): Promise<unknown>;
  put(clave: string, valor: string): Promise<void>;
  delete(clave: string): Promise<void>;
  list(op: { prefix: string; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
}

export interface Env {
  SUSCRIPCIONES: KV;
  DATOS_URL: string;
  ORIGENES: string;
  VAPID_CONTACTO: string;
  VAPID_PUBLICA: string;
  VAPID_PRIVADA: string;
}

/** Solo se aceptan endpoints de servicios push conocidos, para que nadie use el Worker como proxy. */
const SERVICIOS_PUSH = [
  /^fcm\.googleapis\.com$/,
  /^[\w-]+\.push\.services\.mozilla\.com$/,
  /^[\w.-]+\.notify\.windows\.com$/,
  /^[\w.-]+\.push\.apple\.com$/,
];
export const endpointPermitido = (endpoint: string): boolean => {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && SERVICIOS_PUSH.some((r) => r.test(u.hostname));
  } catch {
    return false;
  }
};

async function idDe(endpoint: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint)));
  return [...h.subarray(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const clave = (ruta: string, tipo: TipoAviso, id: string): string => `sub:${ruta}:${tipo}:${id}`;

/** Borra todas las claves de un endpoint (su índice vive en `ep:<id>`). */
async function borrar(kv: KV, id: string, conservar: string[] = []): Promise<void> {
  const previas = ((await kv.get(`ep:${id}`, "json")) as string[] | null) ?? [];
  await Promise.all(previas.filter((k) => !conservar.includes(k)).map((k) => kv.delete(k)));
  if (conservar.length === 0) await kv.delete(`ep:${id}`);
}

function cors(req: Request, env: Env): Record<string, string> {
  const origen = req.headers.get("origin") ?? "";
  const permitidos = env.ORIGENES.split(",").map((s) => s.trim());
  return permitidos.includes(origen)
    ? { "access-control-allow-origin": origen, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400", vary: "origin" }
    : { vary: "origin" };
}

async function atender(req: Request, env: Env): Promise<Response> {
  const cabeceras = cors(req, env);
  const responder = (estado: number, cuerpo: unknown): Response => Response.json(cuerpo, { status: estado, headers: cabeceras });
  const { pathname } = new URL(req.url);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cabeceras });
  if (req.method !== "POST" || (pathname !== "/subscribe" && pathname !== "/unsubscribe")) return responder(404, { error: "No encontrado" });
  if (!("access-control-allow-origin" in cabeceras)) return responder(403, { error: "Origen no permitido" });

  let cuerpo: unknown;
  try {
    const texto = await req.text();
    if (texto.length > 8192) return responder(413, { error: "Petición demasiado grande" });
    cuerpo = JSON.parse(texto);
  } catch {
    return responder(400, { error: "JSON inválido" });
  }

  if (pathname === "/unsubscribe") {
    const p = PeticionDesuscribir.safeParse(cuerpo);
    if (!p.success) return responder(400, { error: "Petición inválida" });
    await borrar(env.SUSCRIPCIONES, await idDe(p.data.endpoint));
    return responder(200, { ok: true });
  }

  const p = PeticionSuscribir.safeParse(cuerpo);
  if (!p.success) return responder(400, { error: "Petición inválida" });
  const { suscripcion, ruta, tipos } = p.data;
  if (!endpointPermitido(suscripcion.endpoint)) return responder(400, { error: "Servicio push no admitido" });

  const id = await idDe(suscripcion.endpoint);
  const claves = [...new Set(tipos)].map((t) => clave(ruta, t, id));
  const valor = JSON.stringify({ endpoint: suscripcion.endpoint, keys: suscripcion.keys });
  // Un endpoint tiene una sola ruta y conjunto de tipos: se reemplaza lo anterior.
  await borrar(env.SUSCRIPCIONES, id, claves);
  await Promise.all(claves.map((k) => env.SUSCRIPCIONES.put(k, valor)));
  await env.SUSCRIPCIONES.put(`ep:${id}`, JSON.stringify(claves));
  return responder(201, { ok: true });
}

async function pedirJSON(url: string): Promise<unknown> {
  // `cf` es una extensión de Cloudflare: guarda la respuesta 5 minutos en el borde.
  const r = await fetch(url, { cf: { cacheTtl: 300, cacheEverything: true } } as RequestInit);
  if (!r.ok) throw new Error(`${url} respondió ${r.status}`);
  return r.json();
}

async function cicloActivo(env: Env, ahora: Date): Promise<Ciclo> {
  const base = env.DATOS_URL.endsWith("/") ? env.DATOS_URL : `${env.DATOS_URL}/`;
  const indice = Indice.parse(await pedirJSON(`${base}index.json`));
  return Ciclo.parse(await pedirJSON(`${base}${elegirCiclo(indice, partesCR(ahora).fecha).archivo}`));
}

async function suscriptores(kv: KV, prefijo: string): Promise<{ clave: string; sub: Suscripcion }[]> {
  const out: { clave: string; sub: Suscripcion }[] = [];
  let cursor: string | undefined;
  do {
    const pagina = await kv.list({ prefix: prefijo, cursor });
    for (const k of pagina.keys) {
      const sub = Suscripcion.safeParse(await kv.get(k.name, "json"));
      if (sub.success) out.push({ clave: k.name, sub: sub.data });
      else await kv.delete(k.name);
    }
    cursor = pagina.list_complete ? undefined : pagina.cursor;
  } while (cursor);
  return out;
}

export async function tic(env: Env, ahora: Date): Promise<{ enviados: number; borrados: number }> {
  const pendientes = avisosPendientes(await cicloActivo(env, ahora), ahora);
  const vapid: Vapid = { publica: env.VAPID_PUBLICA, privada: env.VAPID_PRIVADA, contacto: env.VAPID_CONTACTO };
  let enviados = 0;
  let borrados = 0;
  for (const aviso of pendientes) {
    const minutosAntes = aviso.tipo === "salida5" ? 5 : 10;
    const lista = await suscriptores(env.SUSCRIPCIONES, `sub:${aviso.ruta}:${aviso.tipo}:`);
    await Promise.all(
      lista.map(async ({ clave: k, sub }) => {
        try {
          // El aviso deja de tener sentido cuando el bus ya salió.
          const estado = await enviarPush(sub, JSON.stringify(aviso.mensaje), vapid, { ttl: minutosAntes * 60 });
          if (estado === 404 || estado === 410) {
            await borrar(env.SUSCRIPCIONES, await idDe(sub.endpoint));
            await env.SUSCRIPCIONES.delete(k);
            borrados++;
          } else if (estado >= 200 && estado < 300) {
            enviados++;
          } else {
            console.warn(`Push rechazado (${estado}) para ${k}`);
          }
        } catch (e) {
          console.warn(`Fallo al enviar a ${k}: ${(e as Error).message}`);
        }
      }),
    );
  }
  return { enviados, borrados };
}

export default {
  fetch: (req: Request, env: Env): Promise<Response> => atender(req, env),
  scheduled(evento: { scheduledTime: number }, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): void {
    // Se redondea al minuto programado para que un retraso del cron no cambie el cálculo.
    const ahora = new Date(Math.floor(evento.scheduledTime / 60_000) * 60_000);
    ctx.waitUntil(tic(env, ahora).then((r) => (r.enviados || r.borrados) && console.log(JSON.stringify({ ahora, ...r }))));
  },
};
