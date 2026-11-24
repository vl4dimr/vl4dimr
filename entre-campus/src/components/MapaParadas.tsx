import { useEffect, useRef, useState } from "preact/hooks";
import type { Map as MapaL, Marker } from "leaflet";
import type { Parada } from "../lib/esquema";

/** Mapa con Leaflet + OpenStreetMap. Leaflet se carga solo al abrir esta página. */
export function MapaParadas({ paradas, elegida }: { paradas: Parada[]; elegida: string | null }) {
  const caja = useRef<HTMLDivElement>(null);
  const marcadores = useRef(new Map<string, Marker>());
  const [fallo, setFallo] = useState(false);
  const clave = paradas.map((p) => `${p.id}:${p.lat}:${p.lng}:${p.verificada}`).join("|");

  useEffect(() => {
    let mapa: MapaL | undefined;
    let cancelado = false;
    void (async () => {
      try {
        const [{ default: L }] = await Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]);
        if (cancelado || !caja.current) return;
        mapa = L.map(caja.current, { scrollWheelZoom: false });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(mapa);
        const puntos = paradas.map((p) => L.latLng(p.lat, p.lng));
        // No hay trazado oficial todavía: se une cada parada con una línea punteada de referencia.
        L.polyline(puntos, { color: "#0b6e69", weight: 4, dashArray: "8 8", opacity: 0.9 }).addTo(mapa);
        paradas.forEach((p, i) => {
          const m = L.marker([p.lat, p.lng], {
            title: p.nombre,
            alt: `Parada: ${p.nombre}`,
            icon: L.divIcon({ className: "", html: `<div class="pin"><b>${i + 1}</b></div>`, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] }),
          })
            .addTo(mapa!)
            .bindPopup(`<strong>${p.nombre.replace(/</g, "&lt;")}</strong><br>${p.verificada ? "Ubicación verificada" : "Ubicación sin verificar"}`);
          marcadores.current.set(p.id, m);
        });
        if (puntos.length) mapa.fitBounds(L.latLngBounds(puntos).pad(0.25));
      } catch {
        if (!cancelado) setFallo(true);
      }
    })();
    return () => {
      cancelado = true;
      marcadores.current.clear();
      mapa?.remove();
    };
  }, [clave]);

  useEffect(() => {
    if (elegida) marcadores.current.get(elegida)?.openPopup();
  }, [elegida]);

  if (fallo) return <p class="tarjeta suave">No se pudo cargar el mapa. Las fichas de las paradas siguen disponibles abajo.</p>;
  return <div ref={caja} class="mapa" role="region" aria-label="Mapa de paradas" />;
}
