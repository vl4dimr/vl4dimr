import { useState } from "preact/hooks";
import { MapaParadas } from "../components/MapaParadas";
import { ConDatos, Pie, Titulo } from "../components/piezas";

export function Paradas() {
  const [elegida, setElegida] = useState<string | null>(null);
  return (
    <>
      <Titulo>Paradas</Titulo>
      <ConDatos>
        {(datos) => {
          const { paradas } = datos.ciclo;
          const base = import.meta.env.BASE_URL;
          return (
            <>
              {paradas.some((p) => !p.verificada) && (
                <p class="aviso advertencia">
                  <strong>Atención</strong>
                  Hay paradas sin verificar: su ubicación en el mapa es aproximada. La línea punteada solo une las paradas;
                  no es el recorrido real del bus.
                </p>
              )}
              <MapaParadas paradas={paradas} elegida={elegida} />
              <ul class="pila">
                {paradas.map((p, i) => (
                  <li key={p.id} class="tarjeta parada">
                    <h2 style="margin:0">
                      {i + 1}. {p.nombre}
                    </h2>
                    <div>
                      <span class={`marca-verif ${p.verificada ? "si" : ""}`}>
                        {p.verificada ? "✓ Verificada" : "Sin verificar"}
                      </span>
                    </div>
                    {p.foto ? (
                      <img src={/^https?:/.test(p.foto) ? p.foto : `${base}${p.foto}`} alt={`Foto de la parada ${p.nombre}`} loading="lazy" />
                    ) : (
                      <div class="sin-foto">Aún no hay foto de esta parada</div>
                    )}
                    {p.referencia && <p>{p.referencia}</p>}
                    <div class="fila">
                      <button class="boton secundario" type="button" onClick={() => setElegida(p.id)}>
                        Ver en el mapa
                      </button>
                      <a class="boton secundario" href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=18/${p.lat}/${p.lng}`} rel="noopener noreferrer" target="_blank">
                        Abrir en OpenStreetMap<span class="oculto"> (se abre en otra pestaña)</span>
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
              <Pie datos={datos} />
            </>
          );
        }}
      </ConDatos>
    </>
  );
}
