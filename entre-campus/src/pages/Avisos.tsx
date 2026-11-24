import { ConDatos, ListaAvisos, Pie, Titulo } from "../components/piezas";
import { useApp } from "../estado";
import { avisosActivos } from "../lib/horario";
import { enlace } from "../rutas";

export function Avisos() {
  const { ahora } = useApp();
  return (
    <>
      <Titulo>Avisos</Titulo>
      <ConDatos>
        {(datos) => {
          const avisos = avisosActivos(datos.ciclo, ahora);
          return (
            <>
              {avisos.length === 0 ? (
                <p class="tarjeta suave">No hay avisos activos en este momento.</p>
              ) : (
                <ListaAvisos avisos={avisos} />
              )}
              <p>
                <a class="boton secundario" href={enlace("notificaciones")}>
                  Recibir avisos antes de cada salida
                </a>
              </p>
              <Pie datos={datos} />
            </>
          );
        }}
      </ConDatos>
    </>
  );
}
