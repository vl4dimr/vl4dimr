/** Enrutador mínimo por hash (#/pagina). Funciona en cualquier hosting estático. */
import { useEffect, useState } from "preact/hooks";

export const PAGINAS = {
  "": "Inicio",
  horarios: "Horarios",
  paradas: "Paradas",
  avisos: "Avisos",
  mas: "Más",
  instalar: "Instalar",
  notificaciones: "Notificaciones",
  acerca: "Acerca de",
} as const;
export type Pagina = keyof typeof PAGINAS;

export interface Lugar {
  pagina: Pagina;
  params: URLSearchParams;
}

function leer(previo: Lugar): Lugar {
  const h = location.hash;
  // Anclas como #contenido no son navegación.
  if (h !== "" && !h.startsWith("#/")) return previo;
  const [ruta = "", consulta = ""] = h.slice(2).split("?");
  const pagina = (ruta in PAGINAS ? ruta : "") as Pagina;
  return { pagina, params: new URLSearchParams(consulta) };
}

export function useLugar(): Lugar {
  const [lugar, setLugar] = useState<Lugar>(() => leer({ pagina: "", params: new URLSearchParams() }));
  useEffect(() => {
    const alCambiar = () => setLugar((p) => leer(p));
    addEventListener("hashchange", alCambiar);
    return () => removeEventListener("hashchange", alCambiar);
  }, []);
  return lugar;
}

export const enlace = (p: Pagina): string => `#/${p}`;
