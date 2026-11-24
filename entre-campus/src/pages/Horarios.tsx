import { ConDatos, Pie, SelectorDireccion, Titulo } from "../components/piezas";
import { rutaActual, useApp } from "../estado";
import type { GrupoDias } from "../lib/esquema";
import { salidasDeFranja } from "../lib/horario";
import { descargarICS } from "../lib/ics";
import { aMinutos, formatoFecha, formatoFechaConDia, formatoHora, partesCR } from "../lib/tiempo";

const GRUPO: Record<GrupoDias, string> = { "lunes-viernes": "Lunes a viernes", sabado: "Sábado", domingo: "Domingo" };

export function Horarios() {
  const { rutaId, ahora } = useApp();
  const hoy = partesCR(ahora).fecha;
  return (
    <>
      <Titulo>Horarios</Titulo>
      <ConDatos>
        {(datos) => {
          const { ciclo } = datos;
          const ruta = rutaActual(datos, rutaId);
          const grupos = Object.keys(ruta.franjas) as GrupoDias[];
          const proximas = ciclo.excepciones.filter((e) => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
          return (
            <>
              <SelectorDireccion rutas={ciclo.rutas} actual={ruta} />
              <section class="tarjeta">
                <h2>
                  {ruta.origen} → {ruta.destino}
                </h2>
                <dl class="datos">
                  <dt>Ciclo</dt>
                  <dd>{ciclo.ciclo}</dd>
                  <dt>Vigencia</dt>
                  <dd>
                    {formatoFecha(ciclo.vigencia.inicio)} al {formatoFecha(ciclo.vigencia.fin)}
                  </dd>
                  <dt>Viaje</dt>
                  <dd>unos {ruta.duracionEstimadaMin} min</dd>
                  <dt>Sin servicio</dt>
                  <dd>sábados, domingos y feriados</dd>
                </dl>
              </section>
              {grupos.map((g) => {
                const exactas = ruta.salidasExactas?.[g]?.map(aMinutos);
                return (
                  <section class="tarjeta" key={g}>
                    <h2>{GRUPO[g]}</h2>
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Franja</th>
                          <th scope="col">Horario</th>
                          <th scope="col">Salidas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(ruta.franjas[g] ?? []).map((f) => {
                          const ini = aMinutos(f.inicio);
                          const fin = aMinutos(f.fin);
                          const salidas = exactas ? exactas.filter((m) => m >= ini && m <= fin) : salidasDeFranja(f);
                          return (
                            <tr key={f.nombre}>
                              <th scope="row">{f.nombre}</th>
                              <td>
                                {formatoHora(ini)} – {formatoHora(fin)}
                                {!exactas && <div class="suave chico">cada {f.frecuenciaMin} min</div>}
                              </td>
                              <td>{salidas.map(formatoHora).join(" · ")}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </section>
                );
              })}
              <section class="tarjeta pila">
                <h2>Días sin servicio</h2>
                {proximas.length === 0 ? (
                  <p class="suave">No hay más feriados registrados en este ciclo.</p>
                ) : (
                  <ul class="pila">
                    {proximas.map((e) => (
                      <li key={e.fecha}>
                        <strong style="text-transform:capitalize">{formatoFechaConDia(e.fecha)}</strong> · {e.motivo}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section class="tarjeta pila">
                <h2>Llevar el horario a su calendario</h2>
                <p class="suave">
                  Descargue un archivo .ics con las franjas y salidas de esta ruta para Google Calendar, Apple Calendar u
                  Outlook.
                </p>
                <div>
                  <button class="boton" type="button" onClick={() => descargarICS(ciclo, ruta)}>
                    Exportar a calendario (.ics)
                  </button>
                </div>
              </section>
              <Pie datos={datos} />
            </>
          );
        }}
      </ConDatos>
    </>
  );
}
