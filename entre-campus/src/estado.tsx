/** Estado compartido de la app: datos, reloj, ruta elegida y conexión. */
import { createContext } from "preact";
import { useCallback, useContext, useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { cargarDatos, type Datos } from "./lib/datos";
import type { Ruta } from "./lib/esquema";
import { guardarRuta, leerRuta } from "./lib/preferencias";

export type Carga =
  | { fase: "cargando" }
  | { fase: "error"; mensaje: string }
  | { fase: "lista"; datos: Datos };

interface Contexto {
  carga: Carga;
  reintentar: () => void;
  ahora: Date;
  enLinea: boolean;
  rutaId: string | null;
  elegirRuta: (id: string) => void;
}

const Ctx = createContext<Contexto | null>(null);

/** Permite fijar la hora en pruebas y demos: ?ahora=2027-03-03T18:10:00-06:00 */
function desfaseDePrueba(): number {
  const p = new URLSearchParams(location.search).get("ahora");
  const t = p ? Date.parse(p) : NaN;
  return Number.isNaN(t) ? 0 : t - Date.now();
}
const DESFASE = desfaseDePrueba();
export const ahoraApp = (): Date => new Date(Date.now() + DESFASE);

export function Proveedor({ children }: { children: ComponentChildren }) {
  const [carga, setCarga] = useState<Carga>({ fase: "cargando" });
  const [ahora, setAhora] = useState(ahoraApp);
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [rutaId, setRutaId] = useState(leerRuta);

  const cargar = useCallback((silencioso = false) => {
    if (!silencioso) setCarga({ fase: "cargando" });
    cargarDatos(import.meta.env.BASE_URL, ahoraApp()).then(
      (datos) => setCarga({ fase: "lista", datos }),
      (e: Error) => {
        if (!silencioso) setCarga({ fase: "error", mensaje: e.message });
      },
    );
  }, []);

  useEffect(() => {
    cargar();
    const tic = setInterval(() => setAhora(ahoraApp()), 1000);
    const conexion = () => {
      setEnLinea(navigator.onLine);
      if (navigator.onLine) cargar(true);
    };
    const visible = () => {
      if (document.visibilityState === "visible") {
        setAhora(ahoraApp());
        cargar(true);
      }
    };
    // El service worker avisa cuando revalidó los datos en segundo plano.
    const sw = (e: MessageEvent) => {
      if ((e.data as { type?: string } | null)?.type === "CACHE_UPDATED") cargar(true);
    };
    addEventListener("online", conexion);
    addEventListener("offline", conexion);
    document.addEventListener("visibilitychange", visible);
    navigator.serviceWorker?.addEventListener("message", sw);
    return () => {
      clearInterval(tic);
      removeEventListener("online", conexion);
      removeEventListener("offline", conexion);
      document.removeEventListener("visibilitychange", visible);
      navigator.serviceWorker?.removeEventListener("message", sw);
    };
  }, [cargar]);

  const elegirRuta = useCallback((id: string) => {
    guardarRuta(id);
    setRutaId(id);
  }, []);

  return (
    <Ctx.Provider value={{ carga, reintentar: () => cargar(), ahora, enLinea, rutaId, elegirRuta }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): Contexto {
  const c = useContext(Ctx);
  if (!c) throw new Error("Falta <Proveedor>");
  return c;
}

/** Ruta elegida (o la primera si la guardada ya no existe). */
export function rutaActual(datos: Datos, rutaId: string | null): Ruta {
  return datos.ciclo.rutas.find((r) => r.id === rutaId) ?? datos.ciclo.rutas[0]!;
}
