import { useEffect, useState } from "preact/hooks";
import { Titulo } from "../components/piezas";
import { alCambiarInstalacion, pedirInstalacion, puedeInstalar } from "../lib/instalar";
import { estaInstalada } from "../lib/push";

export function Instalar() {
  const [disponible, setDisponible] = useState(puedeInstalar);
  const [mensaje, setMensaje] = useState("");
  useEffect(() => alCambiarInstalacion(() => setDisponible(puedeInstalar())), []);
  const instalada = estaInstalada();

  return (
    <>
      <Titulo>Instalar la app</Titulo>
      <p class="suave">
        Entre Campus se instala desde el navegador, sin tiendas de aplicaciones. Una vez instalada, abre a pantalla
        completa y muestra el último horario guardado aunque no haya conexión.
      </p>
      <div aria-live="polite">
        {instalada && <p class="aviso">Ya está usando la app instalada.</p>}
        {mensaje && <p class="aviso">{mensaje}</p>}
      </div>
      {disponible && !instalada && (
        <section class="tarjeta pila">
          <h2>Instalación directa</h2>
          <p>Su navegador permite instalar la app con un toque.</p>
          <div>
            <button
              class="boton"
              type="button"
              onClick={async () => setMensaje((await pedirInstalacion()) ? "¡Listo! La app quedó instalada." : "Instalación cancelada.")}
            >
              Instalar Entre Campus
            </button>
          </div>
        </section>
      )}
      <section class="tarjeta">
        <h2>Android (Chrome)</h2>
        <ol class="pasos">
          <li>Abra esta página en Chrome.</li>
          <li>Toque el menú ⋮ en la esquina superior derecha.</li>
          <li>Elija «Agregar a la pantalla principal» o «Instalar app».</li>
          <li>Confirme con «Instalar».</li>
        </ol>
      </section>
      <section class="tarjeta">
        <h2>iPhone y iPad (Safari)</h2>
        <ol class="pasos">
          <li>Abra esta página en Safari.</li>
          <li>Toque el botón Compartir (el cuadro con una flecha hacia arriba).</li>
          <li>Deslice hacia abajo y elija «Agregar a inicio».</li>
          <li>Toque «Agregar».</li>
        </ol>
        <p class="suave chico" style="margin-top:10px">
          En iPhone, las notificaciones solo funcionan con la app instalada y iOS 16.4 o superior.
        </p>
      </section>
      <section class="tarjeta">
        <h2>Computadora (Chrome o Edge)</h2>
        <ol class="pasos">
          <li>Busque el ícono de instalar al final de la barra de direcciones.</li>
          <li>Haga clic en «Instalar».</li>
        </ol>
      </section>
    </>
  );
}
