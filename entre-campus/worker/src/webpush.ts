/**
 * Web Push con WebCrypto, sin dependencias: cifrado aes128gcm (RFC 8291 / RFC 8188)
 * y autenticación VAPID (RFC 8292). Funciona en Cloudflare Workers y en Node 20+.
 */
import type { Suscripcion } from "../../src/lib/contrato";

type Bytes = Uint8Array<ArrayBuffer>;
const enc = new TextEncoder();
const txt = (s: string): Bytes => new Uint8Array(enc.encode(s));

export function b64url(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function deB64url(s: string): Bytes {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function unir(...partes: Uint8Array[]): Bytes {
  const out = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of partes) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** JWK de una clave privada P-256 a partir de `d` y del punto público sin comprimir (65 bytes). */
function jwkPrivada(d: string, publica: Uint8Array): JsonWebKey {
  if (publica.length !== 65 || publica[0] !== 4) throw new Error("Clave pública P-256 inválida");
  return { kty: "EC", crv: "P-256", d, x: b64url(publica.subarray(1, 33)), y: b64url(publica.subarray(33)), ext: true };
}

async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, bytes: number): Promise<Bytes> {
  const clave = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, clave, bytes * 8));
}

export interface ParEfimero {
  /** Clave privada del servidor de aplicación (`d` en base64url). */
  privada: string;
  /** Punto público sin comprimir en base64url. */
  publica: string;
}

/** Cifra el mensaje para una suscripción. `fijo` solo se usa en pruebas (vector del RFC 8291). */
export async function cifrar(
  texto: string,
  sub: Pick<Suscripcion, "keys">,
  fijo?: { sal: Bytes; par: ParEfimero },
): Promise<Bytes> {
  const uaPublica = deB64url(sub.keys.p256dh);
  const secretoAuth = deB64url(sub.keys.auth);
  const sal = fijo?.sal ?? crypto.getRandomValues(new Uint8Array(16));

  let privada: CryptoKey;
  let asPublica: Bytes;
  if (fijo) {
    asPublica = deB64url(fijo.par.publica);
    privada = await crypto.subtle.importKey("jwk", jwkPrivada(fijo.par.privada, asPublica), { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  } else {
    const par = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
    privada = par.privateKey;
    asPublica = new Uint8Array((await crypto.subtle.exportKey("raw", par.publicKey)) as ArrayBuffer);
  }
  const uaClave = await crypto.subtle.importKey("raw", uaPublica, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const compartido = new Uint8Array(
    await crypto.subtle.deriveBits(// Los tipos de Workers nombran distinto este parámetro; en ejecución es el estándar.
    { name: "ECDH", public: uaClave } as never, privada, 256),
  );

  const ikm = await hkdf(secretoAuth, compartido, unir(txt("WebPush: info\0"), uaPublica, asPublica), 32);
  const cek = await hkdf(sal, ikm, txt("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(sal, ikm, txt("Content-Encoding: nonce\0"), 12);

  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // 0x02 marca el último (y único) registro.
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, unir(txt(texto), new Uint8Array([2]))));

  const cabecera = new Uint8Array(21);
  cabecera.set(sal, 0);
  new DataView(cabecera.buffer).setUint32(16, 4096);
  cabecera[20] = asPublica.length;
  return unir(cabecera, asPublica, cifrado);
}

export interface Vapid {
  publica: string;
  privada: string;
  contacto: string;
}

/** Cabecera Authorization de VAPID para el servicio push del endpoint. */
export async function cabeceraVapid(endpoint: string, v: Vapid, ahoraSeg = Math.floor(Date.now() / 1000)): Promise<string> {
  const clave = await crypto.subtle.importKey("jwk", jwkPrivada(v.privada, deB64url(v.publica)), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const parte = (o: unknown): string => b64url(enc.encode(JSON.stringify(o)));
  const base = `${parte({ typ: "JWT", alg: "ES256" })}.${parte({ aud: new URL(endpoint).origin, exp: ahoraSeg + 12 * 3600, sub: v.contacto })}`;
  const firma = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, clave, enc.encode(base)));
  return `vapid t=${base}.${b64url(firma)}, k=${v.publica}`;
}

export interface OpcionesPush {
  ttl: number;
  urgencia?: "very-low" | "low" | "normal" | "high";
}

/** Envía un push. Devuelve el código HTTP del servicio (201 = aceptado; 404/410 = suscripción muerta). */
export async function enviarPush(sub: Suscripcion, texto: string, vapid: Vapid, op: OpcionesPush): Promise<number> {
  const r = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/octet-stream",
      "content-encoding": "aes128gcm",
      ttl: String(op.ttl),
      urgency: op.urgencia ?? "high",
      authorization: await cabeceraVapid(sub.endpoint, vapid),
    },
    body: await cifrar(texto, sub),
  });
  await r.body?.cancel();
  return r.status;
}
