import { ConDatos, Titulo } from "../components/piezas";
import { PanelViajes } from "../components/viaje";
import { rutaActual, useApp } from "../estado";

export function Viajes() {
  const { ahora, rutaId } = useApp();
  return (
    <>
      <Titulo>Mis viajes</Titulo>
      <ConDatos>{(datos) => <PanelViajes ciclo={datos.ciclo} ruta={rutaActual(datos, rutaId)} ahora={ahora} />}</ConDatos>
    </>
  );
}
