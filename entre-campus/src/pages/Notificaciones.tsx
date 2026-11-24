import { useState } from "preact/hooks";
import { ConDatos, Titulo } from "../components/piezas";
import { rutaActual, useApp } from "../estado";
import type { TipoAviso } from "../lib/contrato";
import type { Datos } from "../lib/datos";
import { desuscribir, esIOS, estaInstalada, leerPreferenciaPush, pushConfigurado, pushSoportado, suscribir } from "../lib/push";
import { enlace } from "../rutas";

const TIPOS: { id: TipoAviso; texto: string; detalle: string }[] = [
  { id: "salida10", texto: "10 minutos antes de cada salida", detalle: "Para salir con tiempo hacia la parada." },
  { id: "salida5", texto: "5 minutos antes de cada salida", detalle: "Un último recordatorio." },
  { id: "franja10", texto: "Cuando una franja está por empezar", detalle: "«La franja de Mañana, Mediodía o Noche empieza en 10 min»." },
];

function Formulario({ datos }: { datos: Datos }) {
  const { rutaId } = useApp();
  const guardada = leerPreferenciaPush();
  const [ruta, setRuta] = useState(guardada?.ruta ?? rutaActual(datos, rutaId).id);
  const [tipos, setTipos] = useState<TipoAviso[]>(guardada?.tipos ?? ["salida10"]);
  const [activa, setActiva] = useState(guardada !== null);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  const disponible = pushConfigurado() && pushSoportado();
  const ejecutar = async (accion: () => Promise<void>, exito: string, quedaActiva: boolean) => {
    setOcupado(true);
    setMensaje(null);
    try {
      await accion();
      setActiva(quedaActiva);
      setMensaje({ ok: true, texto: exito });
    } catch (e) {
      setMensaje({ ok: false, texto: (e as Error).message });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <form
      class="tarjeta pila"
      onSubmit={(e) => {
        e.preventDefault();
        void ejecutar(() => suscribir({ ruta, tipos }), "Listo. Le avisaremos según lo que eligió.", true);
      }}
    >
      <h2>Sus avisos</h2>
      <label class="campo">
        Ruta
        <select value={ruta} onChange={(e) => setRuta(e.currentTarget.value)}>
          {datos.ciclo.rutas.map((r) => (
            <option key={r.id} value={r.id}>
              {r.origen} → {r.destino}
            </option>
          ))}
        </select>
      </label>
      <fieldset style="border:0;padding:0;margin:0">
        <legend style="font-weight:600;padding:0">¿Cuándo quiere que le avisemos?</legend>
        {TIPOS.map((t) => (
          <label class="casilla" key={t.id}>
            <input
              type="checkbox"
              checked={tipos.includes(t.id)}
              onChange={(e) => setTipos(e.currentTarget.checked ? [...tipos, t.id] : tipos.filter((x) => x !== t.id))}
            />
            <span>
              {t.texto}
              <span class="suave chico" style="display:block">
                {t.detalle}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <div class="fila">
        <button class="boton" type="submit" disabled={!disponible || ocupado || tipos.length === 0}>
          {activa ? "Guardar cambios" : "Activar notificaciones"}
        </button>
        {activa && (
          <button class="boton secundario" type="button" disabled={ocupado} onClick={() => void ejecutar(desuscribir, "Notificaciones desactivadas.", false)}>
            Desactivar
          </button>
        )}
      </div>
      <div aria-live="polite">
        {mensaje && <p class={`aviso ${mensaje.ok ? "" : "critico"}`}>{mensaje.texto}</p>}
      </div>
    </form>
  );
}

export function Notificaciones() {
  const iosSinInstalar = esIOS() && !estaInstalada();
  return (
    <>
      <Titulo>Notificaciones</Titulo>
      <p class="suave">Reciba un aviso en el teléfono antes de que salga el bus. Puede desactivarlo cuando quiera.</p>
      <p class={`aviso ${iosSinInstalar ? "advertencia" : ""}`}>
        <strong>iPhone y iPad</strong>
        Las notificaciones solo funcionan con la app instalada en la pantalla de inicio y con iOS 16.4 o superior.{" "}
        <a href={enlace("instalar")}>Ver cómo instalarla</a>
      </p>
      {!pushSoportado() && (
        <p class="aviso advertencia">
          <strong>No disponible</strong>
          Este navegador no admite notificaciones push.
        </p>
      )}
      {!pushConfigurado() && (
        <p class="aviso advertencia">
          <strong>Aún no disponible</strong>
          El servidor de notificaciones todavía no está configurado en este sitio.
        </p>
      )}
      <ConDatos>{(datos) => <Formulario datos={datos} />}</ConDatos>
      <p class="suave chico">
        Privacidad: solo se guarda la dirección técnica que su navegador genera para recibir avisos, junto con la ruta y
        el tipo de aviso. No se guarda su nombre, correo ni ubicación.
      </p>
    </>
  );
}
