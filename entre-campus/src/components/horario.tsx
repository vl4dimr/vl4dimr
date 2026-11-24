import type { Ciclo, Franja, Ruta } from "../lib/esquema";
import { estadoServicio, franjaEn, franjasDe, proximaSalida, salidasDeHoy, type SalidaDelDia } from "../lib/horario";
import { lineaEstado, textoEstado } from "../lib/textos";
import { aMinutos, diaRelativo, formatoCuenta, formatoHora, partesCR, type FechaISO } from "../lib/tiempo";

interface Base {
  ciclo: Ciclo;
  ruta: Ruta;
  ahora: Date;
}

export function EstadoServicio({ ciclo, ruta, ahora, proximoCiclo }: Base & { proximoCiclo: FechaISO | null }) {
  const t = textoEstado(estadoServicio(ciclo, ruta, ahora), ciclo, ahora, proximoCiclo);
  const linea = lineaEstado(t);
  const corte = linea.indexOf(t.detalle);
  return (
    <p class={`estado ${t.activo ? "activo" : ""}`} role="status" aria-live="polite" data-testid="estado">
      <span class="punto" aria-hidden="true" />
      <span>
        {corte > 0 ? linea.slice(0, corte) : ""}
        {corte > 0 ? <span>{t.detalle}</span> : linea}
      </span>
    </p>
  );
}

export function ProximaSalida({ ciclo, ruta, ahora }: Base) {
  const s = proximaSalida(ciclo, ruta, ahora);
  if (!s) return null;
  const hoy = partesCR(ahora).fecha;
  const faltan = (s.instante.getTime() - ahora.getTime()) / 1000;
  const llegada = formatoHora(partesCR(s.llegada).minutos);
  return (
    <section class="tarjeta proxima" aria-labelledby="t-proxima">
      <h2 id="t-proxima">Próxima salida desde {ruta.origen}</h2>
      <p class="hora" data-testid="proxima-hora">
        {formatoHora(s.minutos)}
        {s.fecha !== hoy && <span class="chico"> · {diaRelativo(hoy, s.fecha)}</span>}
      </p>
      <p class="cuenta" role="timer" aria-live="off" data-testid="cuenta">
        {faltan < 1 ? "Sale ahora" : `Sale en ${formatoCuenta(faltan)}`}
      </p>
      <p class="llegada">
        Llegada estimada a {ruta.destino}: <strong>{llegada}</strong> (unos {ruta.duracionEstimadaMin} min de viaje)
      </p>
    </section>
  );
}

const rango = (f: Franja): string => `${formatoHora(aMinutos(f.inicio))} – ${formatoHora(aMinutos(f.fin))}`;

export function LineaTiempo({ ciclo, ruta, ahora }: Base) {
  const { fecha, minutos } = partesCR(ahora);
  const franjas = franjasDe(ciclo, ruta, fecha);
  if (franjas.length === 0) return null;
  const actual = franjaEn(franjas, minutos);
  const ini = aMinutos(franjas[0]!.inicio) - 60;
  const fin = aMinutos(franjas.at(-1)!.fin) + 60;
  const pct = (m: number): string => `${(Math.min(Math.max((m - ini) / (fin - ini), 0), 1) * 100).toFixed(2)}%`;
  return (
    <section class="tarjeta" aria-labelledby="t-linea">
      <h2 id="t-linea">Franjas de hoy</h2>
      <div class="linea" aria-hidden="true">
        {franjas.map((f) => (
          <span
            key={f.nombre}
            class={`tramo ${f === actual ? "actual" : ""}`}
            style={{ left: pct(aMinutos(f.inicio)), right: `calc(100% - ${pct(aMinutos(f.fin))})` }}
          />
        ))}
        {minutos >= ini && minutos <= fin && <span class="ahora" style={{ left: pct(minutos) }} />}
      </div>
      <ol class="franjas">
        {franjas.map((f) => {
          const pasada = minutos >= aMinutos(f.fin);
          return (
            <li key={f.nombre} class={f === actual ? "actual" : pasada ? "pasada" : ""} aria-current={f === actual ? "time" : undefined}>
              <strong>{f.nombre}</strong>
              {rango(f)}
              <br />
              {f === actual ? <span class="etiqueta">Ahora</span> : pasada ? "Terminó" : "Pendiente"}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function ListaSalidas({ ciclo, ruta, ahora }: Base) {
  const salidas = salidasDeHoy(ciclo, ruta, ahora);
  if (salidas.length === 0) return null;
  const restantes = salidas.filter((s) => !s.pasada);
  const siguiente = restantes[0];
  const grupos = new Map<string, SalidaDelDia[]>();
  for (const s of salidas) {
    const k = s.franja ?? "Otras salidas";
    grupos.set(k, [...(grupos.get(k) ?? []), s]);
  }
  return (
    <section class="tarjeta" aria-labelledby="t-salidas">
      <h2 id="t-salidas">Salidas de hoy</h2>
      <p class="suave chico" data-testid="restantes">
        {restantes.length === 0
          ? "Ya no quedan salidas hoy."
          : restantes.length === 1
            ? "Queda 1 salida hoy."
            : `Quedan ${restantes.length} salidas hoy.`}
      </p>
      {[...grupos].map(([nombre, lista]) => (
        <div class="grupo-franja" key={nombre}>
          <h3>{nombre}</h3>
          <ul class="salidas">
            {lista.map((s) => (
              <li key={s.minutos} class={s.pasada ? "pasada" : s === siguiente ? "siguiente" : ""}>
                {formatoHora(s.minutos)}
                {s.pasada && <span class="oculto"> (ya salió)</span>}
                {s === siguiente && <span class="oculto"> (próxima)</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
