import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { Datos } from "../lib/datos";
import type { Aviso, Ruta } from "../lib/esquema";
import { formatoFecha, partesCR } from "../lib/tiempo";
import { useApp } from "../estado";

/** Título de página: recibe el foco al navegar para que los lectores de pantalla lo anuncien. */
export function Titulo({ children }: { children: ComponentChildren }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (sessionStorage.getItem("ec:nav")) ref.current?.focus();
    sessionStorage.setItem("ec:nav", "1");
  }, []);
  return (
    <h1 ref={ref} tabIndex={-1}>
      {children}
    </h1>
  );
}

const corto = (campus: string): string => campus.replace(/^Campus\s+/, "");

export function SelectorDireccion({ rutas, actual }: { rutas: Ruta[]; actual: Ruta }) {
  const { elegirRuta } = useApp();
  return (
    <fieldset class="direccion">
      <legend>Dirección del viaje</legend>
      <div class="opciones">
        {rutas.map((r) => (
          <div key={r.id}>
            <input
              type="radio"
              name="direccion"
              id={`dir-${r.id}`}
              value={r.id}
              checked={r.id === actual.id}
              onChange={() => elegirRuta(r.id)}
            />
            <label for={`dir-${r.id}`}>
              <div>
                {corto(r.origen)}
                <span>hacia {corto(r.destino)}</span>
              </div>
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

const NIVEL = { info: "Información", advertencia: "Atención", critico: "Importante" } as const;

export function ListaAvisos({ avisos }: { avisos: Aviso[] }) {
  if (avisos.length === 0) return null;
  return (
    <ul class="pila" aria-label="Avisos activos">
      {avisos.map((a) => (
        <li key={a.id} class={`aviso ${a.nivel}`}>
          <strong>{NIVEL[a.nivel]}</strong>
          <p>{a.texto}</p>
        </li>
      ))}
    </ul>
  );
}

export function Pie({ datos }: { datos: Datos }) {
  const { ciclo } = datos;
  const esUrl = /^https?:\/\//.test(ciclo.fuente);
  return (
    <footer class="pie">
      <p>
        <strong>Fuente:</strong>{" "}
        {esUrl ? (
          <a href={ciclo.fuente} rel="noopener noreferrer">
            {ciclo.fuente}
          </a>
        ) : (
          ciclo.fuente
        )}
      </p>
      <p>
        Ciclo {ciclo.ciclo} · Actualizado el {formatoFecha(ciclo.actualizado)}
      </p>
      <p>Proyecto independiente y no oficial. No está afiliado a la Universidad Nacional (UNA).</p>
    </footer>
  );
}

export function Cargando() {
  return (
    <div class="cargando" role="status">
      <span class="oculto">Cargando el horario…</span>
      <div class="hueso" />
      <div class="hueso" style="height:150px" />
      <div class="hueso" />
    </div>
  );
}

export function ErrorCarga({ mensaje }: { mensaje: string }) {
  const { reintentar } = useApp();
  return (
    <div class="tarjeta pila" role="alert">
      <h2>No se pudo cargar el horario</h2>
      <p class="suave">{mensaje}. Revise su conexión e inténtelo de nuevo.</p>
      <div>
        <button class="boton" type="button" onClick={reintentar}>
          Reintentar
        </button>
      </div>
    </div>
  );
}

/** Envuelve una página que necesita los datos: muestra carga, error o el contenido. */
export function ConDatos({ children }: { children: (datos: Datos) => ComponentChildren }) {
  const { carga } = useApp();
  if (carga.fase === "cargando") return <Cargando />;
  if (carga.fase === "error") return <ErrorCarga mensaje={carga.mensaje} />;
  return <>{children(carga.datos)}</>;
}

export function BandaConexion() {
  const { carga, enLinea } = useApp();
  if (carga.fase !== "lista") return null;
  const { datos } = carga;
  const mostrar = !enLinea || datos.deCopia;
  return (
    <div aria-live="polite">
      {mostrar && (
        <p class="banda">Sin conexión · datos del {formatoFecha(partesCR(new Date(datos.obtenido)).fecha)}</p>
      )}
      {datos.ciclo.ejemplo && <p class="banda">Datos de ejemplo · no son el horario oficial</p>}
    </div>
  );
}
