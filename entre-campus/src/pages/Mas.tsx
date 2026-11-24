import { Titulo } from "../components/piezas";
import { enlace } from "../rutas";

export function Mas() {
  return (
    <>
      <Titulo>Más</Titulo>
      <ul class="enlaces">
        <li>
          <a href={enlace("viajes")}>
            <div>
              Mis viajes<span>Su racha, insignias e historial</span>
            </div>
            <span aria-hidden="true">›</span>
          </a>
        </li>
        <li>
          <a href={enlace("notificaciones")}>
            <div>
              Notificaciones<span>Avisos antes de cada salida o franja</span>
            </div>
            <span aria-hidden="true">›</span>
          </a>
        </li>
        <li>
          <a href={enlace("instalar")}>
            <div>
              Instalar la app<span>Téngala en la pantalla de inicio y úsela sin conexión</span>
            </div>
            <span aria-hidden="true">›</span>
          </a>
        </li>
        <li>
          <a href={enlace("acerca")}>
            <div>
              Acerca de<span>Qué es este proyecto, privacidad y cómo colaborar</span>
            </div>
            <span aria-hidden="true">›</span>
          </a>
        </li>
      </ul>
    </>
  );
}
