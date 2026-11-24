/** Suscripción a notificaciones push desde la app. */
import type { PeticionSuscribir, TipoAviso } from "./contrato";

const API = (import.meta.env.VITE_PUSH_API as string | undefined)?.replace(/\/$/, "");
const CLAVE_PUBLICA = import.meta.env.VITE_VAPID_PUBLICA as string | undefined;
const CLAVE = "ec:push";

export interface PreferenciaPush {
  ruta: string;
  tipos: TipoAviso[];
}

export const pushConfigurado = (): boolean => Boolean(API && CLAVE_PUBLICA);
export const pushSoportado = (): boolean =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export const esIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const estaInstalada = (): boolean =>
  matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

export function leerPreferenciaPush(): PreferenciaPush | null {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? "null") as PreferenciaPush | null;
  } catch {
    return null;
  }
}

function b64urlABytes(s: string): Uint8Array<ArrayBuffer> {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

async function enviar(ruta: string, cuerpo: unknown): Promise<void> {
  const r = await fetch(`${API}${ruta}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  if (!r.ok) throw new Error(`El servidor de avisos respondió ${r.status}`);
}

export async function suscribir(pref: PreferenciaPush): Promise<void> {
  if (!pushConfigurado()) throw new Error("Las notificaciones aún no están configuradas en este sitio");
  if (!pushSoportado()) throw new Error("Este navegador no admite notificaciones push");
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") throw new Error("No se dio permiso para mostrar notificaciones");
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlABytes(CLAVE_PUBLICA!) }));
  const peticion: PeticionSuscribir = {
    suscripcion: sub.toJSON() as PeticionSuscribir["suscripcion"],
    ruta: pref.ruta,
    tipos: pref.tipos,
  };
  await enviar("/subscribe", peticion);
  localStorage.setItem(CLAVE, JSON.stringify(pref));
}

export async function desuscribir(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    if (pushConfigurado()) await enviar("/unsubscribe", { endpoint: sub.endpoint }).catch(() => undefined);
    await sub.unsubscribe();
  }
  localStorage.removeItem(CLAVE);
}
