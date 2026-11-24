/// <reference lib="webworker" />
import { BroadcastUpdatePlugin } from "workbox-broadcast-update";
import { ExpirationPlugin } from "workbox-expiration";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import type { MensajePush } from "./lib/contrato";

declare const self: ServiceWorkerGlobalScope;

// Shell de la app en caché.
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));

// Datos del horario: responde con la copia y la actualiza en segundo plano.
registerRoute(
  ({ url }) => url.origin === self.location.origin && /\/data\/[\w.-]+\.json$/.test(url.pathname),
  new StaleWhileRevalidate({ cacheName: "datos", plugins: [new BroadcastUpdatePlugin()] }),
);

// Teselas del mapa.
registerRoute(
  ({ url }) => url.hostname === "tile.openstreetmap.org",
  new CacheFirst({
    cacheName: "mapa",
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 3600, purgeOnQuotaError: true })],
  }),
);

self.addEventListener("install", () => void self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let m: Partial<MensajePush>;
  try {
    m = (e.data?.json() ?? {}) as Partial<MensajePush>;
  } catch {
    m = { cuerpo: e.data?.text() };
  }
  const ruta = /^[a-z0-9-]+$/.test(m.ruta ?? "") ? m.ruta : undefined;
  e.waitUntil(
    self.registration.showNotification(m.titulo ?? "Entre Campus", {
      body: m.cuerpo ?? "",
      tag: m.etiqueta,
      lang: "es-CR",
      icon: "icons/icono-192.png",
      badge: "icons/insignia.png",
      data: { url: ruta ? `#/?ruta=${ruta}` : "#/" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const destino = new URL((e.notification.data as { url: string }).url, self.registration.scope).href;
  e.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const abierta = ventanas.find((c) => c.url.startsWith(self.registration.scope));
      if (abierta) {
        await abierta.navigate(destino).catch(() => undefined);
        await abierta.focus();
      } else {
        await self.clients.openWindow(destino);
      }
    })(),
  );
});
