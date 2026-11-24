import { afterEach, describe, expect, it, vi } from "vitest";
import { avisosPendientes } from "../../worker/src/avisos";
import worker, { endpointPermitido, tic, type Env } from "../../worker/src/index";
import { b64url, cabeceraVapid, cifrar, deB64url } from "../../worker/src/webpush";
import { generarICS } from "../../src/lib/ics";
import { ciclo, cr, ruta } from "./fixture";

const MIE = "2027-03-03";
const resumen = (fecha: string, hora: string) => avisosPendientes(ciclo, cr(fecha, hora)).map((a) => `${a.ruta}:${a.tipo}`);

describe("avisosPendientes", () => {
  it("10 min antes de una franja avisa de la franja y de su primera salida", () => {
    expect(resumen(MIE, "05:50")).toEqual(["od-bn:salida10", "od-bn:franja10", "bn-od:franja10"]);
    const [salida, franja] = avisosPendientes(ciclo, cr(MIE, "05:50"));
    expect(salida!.mensaje).toEqual({ titulo: "El bus sale en 10 min", cuerpo: "Salida de las 6:00 a.m. · Campus Omar Dengo → Campus Benjamín Núñez", ruta: "od-bn", etiqueta: "od-bn-2027-03-03-360" });
    expect(franja!.mensaje.titulo).toBe("La franja de Mañana empieza en 10 min");
  });
  it("5 y 10 min antes de cada salida, también con salidas exactas", () => {
    expect(resumen(MIE, "05:55")).toEqual(["od-bn:salida5"]);
    expect(resumen(MIE, "06:00")).toEqual(["bn-od:salida10"]); // 06:10 exacta
    expect(resumen(MIE, "06:20")).toEqual(["od-bn:salida10"]);
    expect(resumen(MIE, "19:50")).toEqual(["od-bn:salida10", "bn-od:salida5"]);
  });
  it("no avisa en minutos sin nada, fines de semana, feriados ni fuera de vigencia", () => {
    expect(resumen(MIE, "05:51")).toEqual([]);
    expect(resumen(MIE, "09:30")).toEqual([]);
    expect(resumen("2027-03-06", "05:50")).toEqual([]);
    expect(resumen("2027-03-25", "05:50")).toEqual([]);
    expect(resumen("2027-02-12", "05:50")).toEqual([]);
    expect(resumen("2027-06-28", "05:50")).toEqual([]);
  });
});

describe("Web Push", () => {
  it("reproduce el vector de prueba del RFC 8291 (apéndice A)", async () => {
    const cuerpo = await cifrar(
      "When I grow up, I want to be a watermelon",
      { keys: { p256dh: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4", auth: "BTBZMqHH6r4Tts7J_aSIgg" } },
      {
        sal: deB64url("DGv6ra1nlYgDCS1FRnbzlw"),
        par: { privada: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw", publica: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8" },
      },
    );
    expect(b64url(cuerpo)).toBe(
      "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
    );
  });

  it("firma un JWT VAPID verificable con la clave pública", async () => {
    const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const publica = b64url(new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey)));
    const privada = (await crypto.subtle.exportKey("jwk", par.privateKey)).d!;
    const cab = await cabeceraVapid("https://fcm.googleapis.com/fcm/send/abc", { publica, privada, contacto: "mailto:a@example.com" }, 1_800_000_000);
    const [, jwt, k] = /^vapid t=(.+), k=(.+)$/.exec(cab)!;
    expect(k).toBe(publica);
    const [h, p, firma] = jwt!.split(".");
    expect(JSON.parse(new TextDecoder().decode(deB64url(p!)))).toEqual({ aud: "https://fcm.googleapis.com", exp: 1_800_043_200, sub: "mailto:a@example.com" });
    expect(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, par.publicKey, deB64url(firma!), new TextEncoder().encode(`${h}.${p}`))).toBe(true);
  });
});

/** KV en memoria con la parte de la API que usa el Worker. */
function kvFalso() {
  const m = new Map<string, string>();
  return {
    m,
    get: async (k: string): Promise<unknown> => (m.has(k) ? JSON.parse(m.get(k)!) : null),
    put: async (k: string, v: string) => void m.set(k, v),
    delete: async (k: string) => void m.delete(k),
    list: async ({ prefix }: { prefix: string }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }),
  };
}

async function entorno() {
  const kv = kvFalso();
  const vapid = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const env = {
    SUSCRIPCIONES: kv,
    DATOS_URL: "https://sitio.example/data/",
    ORIGENES: "https://sitio.example",
    VAPID_CONTACTO: "mailto:a@example.com",
    VAPID_PUBLICA: b64url(new Uint8Array(await crypto.subtle.exportKey("raw", vapid.publicKey))),
    VAPID_PRIVADA: (await crypto.subtle.exportKey("jwk", vapid.privateKey)).d!,
  } satisfies Env;
  const ua = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const keys = { p256dh: b64url(new Uint8Array(await crypto.subtle.exportKey("raw", ua.publicKey))), auth: b64url(crypto.getRandomValues(new Uint8Array(16))) };
  const pedir = (ruta: string, cuerpo: unknown, origen = "https://sitio.example") =>
    worker.fetch(new Request(`https://w.example${ruta}`, { method: "POST", headers: { origin: origen }, body: JSON.stringify(cuerpo) }), env);
  return { kv, env, keys, pedir };
}

describe("Worker", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("solo admite endpoints de servicios push conocidos", () => {
    expect(endpointPermitido("https://fcm.googleapis.com/fcm/send/x")).toBe(true);
    expect(endpointPermitido("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(true);
    expect(endpointPermitido("https://web.push.apple.com/x")).toBe(true);
    expect(endpointPermitido("https://evil.example/fcm.googleapis.com")).toBe(false);
    expect(endpointPermitido("http://fcm.googleapis.com/x")).toBe(false);
  });

  it("suscribe por ruta y tipo, reemplaza y desuscribe", async () => {
    const { kv, keys, pedir } = await entorno();
    const suscripcion = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys };
    expect((await pedir("/subscribe", { suscripcion, ruta: "od-bn", tipos: ["salida10", "franja10"] })).status).toBe(201);
    expect([...kv.m.keys()].filter((k) => k.startsWith("sub:")).map((k) => k.split(":").slice(0, 3).join(":")).sort()).toEqual(["sub:od-bn:franja10", "sub:od-bn:salida10"]);
    await pedir("/subscribe", { suscripcion, ruta: "bn-od", tipos: ["salida5"] });
    expect([...kv.m.keys()].filter((k) => k.startsWith("sub:")).map((k) => k.split(":").slice(0, 3).join(":"))).toEqual(["sub:bn-od:salida5"]);
    expect((await pedir("/unsubscribe", { endpoint: suscripcion.endpoint })).status).toBe(200);
    expect(kv.m.size).toBe(0);
  });

  it("rechaza orígenes ajenos, peticiones inválidas y endpoints no admitidos", async () => {
    const { kv, keys, pedir } = await entorno();
    const suscripcion = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys };
    expect((await pedir("/subscribe", { suscripcion, ruta: "od-bn", tipos: ["salida10"] }, "https://otro.example")).status).toBe(403);
    expect((await pedir("/subscribe", { suscripcion, ruta: "od-bn", tipos: ["cualquiera"] })).status).toBe(400);
    expect((await pedir("/subscribe", { suscripcion: { ...suscripcion, endpoint: "https://evil.example/x" }, ruta: "od-bn", tipos: ["salida10"] })).status).toBe(400);
    expect((await pedir("/otra", {})).status).toBe(404);
    expect(kv.m.size).toBe(0);
  });

  it("el cron envía a quien corresponde y borra las suscripciones 404/410", async () => {
    const { kv, env, keys, pedir } = await entorno();
    const viva = "https://fcm.googleapis.com/fcm/send/viva";
    const muerta = "https://fcm.googleapis.com/fcm/send/muerta";
    const otraRuta = "https://fcm.googleapis.com/fcm/send/otra";
    await pedir("/subscribe", { suscripcion: { endpoint: viva, keys }, ruta: "od-bn", tipos: ["salida10"] });
    await pedir("/subscribe", { suscripcion: { endpoint: muerta, keys }, ruta: "od-bn", tipos: ["salida10", "salida5"] });
    await pedir("/subscribe", { suscripcion: { endpoint: otraRuta, keys }, ruta: "bn-od", tipos: ["salida5"] });

    const indice = { activo: "I-2027", ciclos: [{ ciclo: "I-2027", archivo: "I-2027.json", inicio: "2027-02-15", fin: "2027-06-25" }] };
    const enviados: { url: string; cabeceras: Headers; bytes: number }[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      if (url.endsWith("index.json")) return Response.json(indice);
      if (url.endsWith("I-2027.json")) return Response.json(ciclo);
      enviados.push({ url, cabeceras: new Headers(init!.headers), bytes: (init!.body as Uint8Array).length });
      return new Response(null, { status: url === muerta ? 410 : 201 });
    });

    // 06:20 → sale el de 06:30 de od-bn en 10 min.
    expect(await tic(env, cr(MIE, "06:20"))).toEqual({ enviados: 1, borrados: 1 });
    expect(enviados.map((e) => e.url).sort()).toEqual([muerta, viva]);
    const c = enviados[0]!.cabeceras;
    expect(c.get("content-encoding")).toBe("aes128gcm");
    expect(c.get("ttl")).toBe("600");
    expect(c.get("authorization")).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/);
    expect(enviados[0]!.bytes).toBeGreaterThan(86 + 17);
    // La muerta desaparece de todos sus tipos; las demás siguen.
    expect([...kv.m.keys()].filter((k) => k.startsWith("sub:")).map((k) => k.split(":").slice(1, 3).join(":")).sort()).toEqual(["bn-od:salida5", "od-bn:salida10"]);

    enviados.length = 0;
    expect(await tic(env, cr(MIE, "09:30"))).toEqual({ enviados: 0, borrados: 0 });
    expect(await tic(env, cr("2027-03-06", "06:20"))).toEqual({ enviados: 0, borrados: 0 });
    expect(enviados).toEqual([]);
  });
});

describe("exportación .ics", () => {
  const ics = generarICS(ciclo, ruta, new Date("2027-02-01T00:00:00Z"));
  it("tiene un evento semanal por franja, en hora de Costa Rica y sin feriados", () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics).toContain("DTSTART;TZID=America/Costa_Rica:20270215T060000\r\n");
    expect(ics).toContain("DTEND;TZID=America/Costa_Rica:20270215T200000\r\n");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20270626T055959Z\r\n");
    expect(ics).toContain("EXDATE;TZID=America/Costa_Rica:20270325T120000,20270326T120000\r\n");
    expect(ics.replace(/\r\n /g, "")).toContain("Salidas: 6:00 a.m.\\, 6:30 a.m.\\, 7:00 a.m.\\, 7:30 a.m.\\, 8:00 a.m.");
  });
  it("usa CRLF y pliega las líneas a 75 octetos", () => {
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
    for (const l of ics.split("\r\n")) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
  });
});
