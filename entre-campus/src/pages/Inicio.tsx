import { ConDatos, ListaAvisos, Pie, SelectorDireccion, Titulo } from "../components/piezas";
import { EstadoServicio, LineaTiempo, ListaSalidas } from "../components/horario";
import { EnCamino, MisViajes, ProximaSalida } from "../components/viaje";
import { rutaActual, useApp } from "../estado";
import { avisosActivos } from "../lib/horario";

export function Inicio() {
  const { ahora, rutaId } = useApp();
  return (
    <>
      <Titulo>Bus interno UNA</Titulo>
      <ConDatos>
        {(datos) => {
          const ruta = rutaActual(datos, rutaId);
          const base = { ciclo: datos.ciclo, ruta, ahora };
          return (
            <>
              <SelectorDireccion rutas={datos.ciclo.rutas} actual={ruta} />
              <EstadoServicio {...base} proximoCiclo={datos.proximoCiclo} />
              <ProximaSalida {...base} />
              <EnCamino {...base} />
              <MisViajes {...base} />
              <LineaTiempo {...base} />
              <ListaSalidas {...base} />
              <ListaAvisos avisos={avisosActivos(datos.ciclo, ahora)} />
              <Pie datos={datos} />
            </>
          );
        }}
      </ConDatos>
    </>
  );
}
