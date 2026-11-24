import { Titulo } from "../components/piezas";
import { useApp } from "../estado";
import { formatoFecha } from "../lib/tiempo";

const REPO = "https://github.com/vl4dimr/vl4dimr/tree/main/entre-campus";

export function AcercaDe() {
  const { carga } = useApp();
  const ciclo = carga.fase === "lista" ? carga.datos.ciclo : null;
  return (
    <>
      <Titulo>Acerca de</Titulo>
      <section class="tarjeta pila">
        <h2>Qué es Entre Campus</h2>
        <p>
          Una app hecha por y para la comunidad universitaria, para consultar rápido el bus interno entre el Campus Omar
          Dengo (Heredia) y el Campus Benjamín Núñez (Lagunilla).
        </p>
        <p>
          <strong>Es un proyecto independiente y no oficial.</strong> No está afiliado a la Universidad Nacional (UNA)
          ni la representa. Los horarios pueden cambiar sin previo aviso: ante la duda, confirme con la fuente oficial.
        </p>
      </section>
      {ciclo && (
        <section class="tarjeta">
          <h2>Datos</h2>
          <dl class="datos">
            <dt>Ciclo</dt>
            <dd>{ciclo.ciclo}</dd>
            <dt>Fuente</dt>
            <dd>{ciclo.fuente}</dd>
            <dt>Actualizado</dt>
            <dd>{formatoFecha(ciclo.actualizado)}</dd>
          </dl>
        </section>
      )}
      <section class="tarjeta pila">
        <h2>Privacidad</h2>
        <p>
          La app no usa cuentas, no rastrea y no tiene publicidad. Sus preferencias (dirección, tema) se guardan solo en
          su dispositivo. El mapa descarga imágenes de OpenStreetMap, que recibe la dirección IP de su conexión como
          cualquier sitio web.
        </p>
      </section>
      <section class="tarjeta pila">
        <h2>Colaborar</h2>
        <p>¿Cambió el horario, una parada está mal ubicada o encontró un error? El código es abierto (licencia MIT).</p>
        <div>
          <a class="boton secundario" href={REPO} rel="noopener noreferrer">
            Ver el proyecto en GitHub
          </a>
        </div>
      </section>
    </>
  );
}
