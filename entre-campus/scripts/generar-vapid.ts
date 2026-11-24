/** Genera un par de claves VAPID. La privada es un secreto: no la suba al repositorio. */
export {};
const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
const b64url = (b: ArrayBuffer): string => Buffer.from(b).toString("base64url");
console.log(`VAPID_PUBLICA=${b64url(await crypto.subtle.exportKey("raw", par.publicKey))}`);
console.log(`VAPID_PRIVADA=${(await crypto.subtle.exportKey("jwk", par.privateKey)).d}`);
