import { useEffect, useState } from "preact/hooks";
import type { Ciclo, Ruta } from "../lib/esquema";
import { franjasDe, proximaSalida } from "../lib/horario";
import { guardarCaminata, leerCaminata } from "../lib/preferencias";
import { diaRelativo, formatoCuenta, formatoHora, partesCR } from "../lib/tiempo";
import {
  agregarViaje, busEnCamino, consejoDeSalida, guardarViajes, insignias, leerViajes, racha, salidaAbordable, yaRegistrado,
  type Insignia, type Viaje,
} from "../lib/viajes";
import { enlace } from "../rutas";

interface Base {
  ciclo: Ciclo;
  ruta: Ruta;
  ahora: Date;
}

const corto = (campus: string): string => campus.replace(/^Campus\s+/, "");

/** Anillo que se llena a medida que se acerca la salida (últimos 30 minutos). */
function Anillo({ faltan }: { faltan: number }) {
  const R = 34;
  const largo = 2 * Math.PI * R;
  const lleno = 1 - Math.min(faltan, 1800) / 1800;
  const min = Math.ceil(faltan / 60);
  return (
    <div class="anillo" aria-hidden="true">
      <svg viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={R} class="pista" />
        <circle cx="40" cy="40" r={R} class="avance" stroke-dasharray={largo} stroke-dashoffset={largo * (1 - lleno)} />
      </svg>
      <span>{faltan < 1 ? "¡Ya!" : min > 99 ? "···" : min}</span>
      {faltan >= 1 && min <= 99 && <small>min</small>}
    </div>
  );
}

export function ProximaSalida({ ciclo, ruta, ahora }: Base) {
  const [caminata, setCaminata] = useState(leerCaminata);
  const [copiado, setCopiado] = useState("");
  const s = proximaSalida(ciclo, ruta, ahora);
  if (!s) return null;
  const hoy = partesCR(ahora).fecha;
  const faltan = (s.instante.getTime() - ahora.getTime()) / 1000;
  const llegada = formatoHora(partesCR(s.llegada).minutos);
  const urgente = faltan <= 120;
  const consejo = caminata > 0 ? consejoDeSalida(ciclo, ruta, ahora, caminata) : null;

  const cambiar = (delta: number) => {
    const n = Math.min(60, Math.max(0, caminata + delta));
    guardarCaminata(n);
    setCaminata(n);
  };
  const compartir = async () => {
    const texto = `Bus UNA: sale a las ${formatoHora(s.minutos)} de ${ruta.origen} hacia ${ruta.destino} (llega aprox. ${llegada}).`;
    const url = location.origin + location.pathname;
    try {
      if (navigator.share) await navigator.share({ title: "Entre Campus", text: texto, url });
      else {
        await navigator.clipboard.writeText(`${texto} ${url}`);
        setCopiado("Copiado al portapapeles");
        setTimeout(() => setCopiado(""), 3000);
      }
    } catch {
      /* la persona canceló */
    }
  };

  return (
    <section class={`tarjeta proxima ${urgente ? "urgente" : ""}`} aria-labelledby="t-proxima">
      <div class="proxima-cuerpo">
        <div>
          <h2 id="t-proxima">Próxima salida desde {ruta.origen}</h2>
          <p class="hora" data-testid="proxima-hora">
            {formatoHora(s.minutos)}
            {s.fecha !== hoy && <span class="chico"> · {diaRelativo(hoy, s.fecha)}</span>}
          </p>
          <p class="cuenta" role="timer" aria-live="off" data-testid="cuenta">
            {faltan < 1 ? "Sale ahora" : `Sale en ${formatoCuenta(faltan)}`}
          </p>
        </div>
        <Anillo faltan={faltan} />
      </div>
      <p class="llegada">
        Llegada estimada a {ruta.destino}: <strong>{llegada}</strong> (unos {ruta.duracionEstimadaMin} min de viaje)
      </p>
      {consejo && (
        <p class="consejo" data-testid="consejo">
          {consejo.perdioLaProxima &&
            `El de las ${formatoHora(s.minutos)} ya no lo alcanza. Para el de las ${formatoHora(consejo.salida.minutos)}: `}
          {consejo.salirEn < 1 ? (
            <strong>{consejo.perdioLaProxima ? "salga" : "Salga"} ya hacia la parada</strong>
          ) : (
            <>
              {consejo.perdioLaProxima ? "salga" : "Salga"} hacia la parada en <strong>{formatoCuenta(consejo.salirEn)}</strong>
            </>
          )}
        </p>
      )}
      <div class="proxima-pie">
        <div class="paso" role="group" aria-label="Minutos que tarda en llegar a la parada">
          <button type="button" onClick={() => cambiar(-1)} disabled={caminata === 0} aria-label="Un minuto menos">
            −
          </button>
          <span aria-live="polite">{caminata === 0 ? "¿Cuánto tarda a la parada?" : `Tardo ${caminata} min a la parada`}</span>
          <button type="button" onClick={() => cambiar(1)} disabled={caminata === 60} aria-label="Un minuto más">
            +
          </button>
        </div>
        <button class="compartir" type="button" onClick={() => void compartir()}>
          Compartir
        </button>
      </div>
      <p class="chico" role="status">
        {copiado}
      </p>
    </section>
  );
}

function IconoBus() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="6" y="4" width="20" height="21" rx="5" fill="currentColor" />
      <rect x="9" y="8" width="14" height="7" rx="2" class="vidrio" />
      <circle cx="11.500" cy="20" r="1.800" class="luz" />
      <circle cx="20.500" cy="20" r="1.800" class="luz" />
      <rect x="9" y="25" width="4" height="3" rx="1" fill="currentColor" />
      <rect x="19" y="25" width="4" height="3" rx="1" fill="currentColor" />
    </svg>
  );
}

/** Recorrido estimado del bus que va en camino. Se basa en el horario, no en GPS. */
export function EnCamino({ ciclo, ruta, ahora }: Base) {
  const v = busEnCamino(ciclo, ruta, ahora);
  if (!v) return null;
  const pct = Math.round(v.progreso * 100);
  const faltan = (v.salida.llegada.getTime() - ahora.getTime()) / 1000;
  return (
    <section class="tarjeta" aria-labelledby="t-camino">
      <h2 id="t-camino">Bus en camino</h2>
      <p>
        El de las {formatoHora(v.salida.minutos)} llega a {corto(ruta.destino)} en unos{" "}
        <strong>{formatoCuenta(Math.ceil(faltan / 60) * 60).replace(/ 00 s$/, "")}</strong>.
      </p>
      <div class="trayecto" role="img" aria-label={`Recorrido estimado: ${pct} por ciento`}>
        <div class="via">
          <div class="hecho" style={{ width: `${pct}%` }} />
          <div class="bus" style={{ left: `${pct}%` }}>
            <IconoBus />
          </div>
        </div>
        <div class="extremos">
          <span>{corto(ruta.origen)}</span>
          <span>{corto(ruta.destino)}</span>
        </div>
      </div>
      <p class="suave chico">Posición estimada según el horario; no es la ubicación real del bus.</p>
    </section>
  );
}

function Confeti() {
  const colores = ["#ffb703", "#12a39a", "#fb8500", "#8ecae6", "#e63946"];
  return (
    <div class="confeti" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <i key={i} style={{ left: `${(i * 37) % 100}%`, background: colores[i % colores.length], animationDelay: `${(i % 7) * 60}ms`, "--giro": `${(i * 53) % 360}deg` }} />
      ))}
    </div>
  );
}

function useViajes(): [Viaje[], (v: Viaje) => void] {
  const [viajes, setViajes] = useState(leerViajes);
  return [
    viajes,
    (v) => {
      const nuevos = agregarViaje(viajes, v);
      guardarViajes(nuevos);
      setViajes(nuevos);
    },
  ];
}

const hayServicioEn = (ciclo: Ciclo, ruta: Ruta) => (f: string): boolean => franjasDe(ciclo, ruta, f).length > 0;

/** Tarjeta de la pantalla principal: registrar el viaje y ver la racha. */
export function MisViajes({ ciclo, ruta, ahora }: Base) {
  const [viajes, registrar] = useViajes();
  const [fiesta, setFiesta] = useState<string | null>(null);
  const hoy = partesCR(ahora).fecha;
  const abordable = salidaAbordable(ciclo, ruta, ahora);
  const candidato: Viaje | null = abordable && { fecha: abordable.fecha, minutos: abordable.minutos, ruta: ruta.id, franja: abordable.franja };
  const hecho = candidato !== null && yaRegistrado(viajes, candidato);
  const servicio = hayServicioEn(ciclo, ruta);
  const dias = racha(viajes, hoy, servicio);
  const viajoHoy = viajes.some((v) => v.fecha === hoy);

  useEffect(() => {
    if (!fiesta) return;
    const t = setTimeout(() => setFiesta(null), 2600);
    return () => clearTimeout(t);
  }, [fiesta]);

  const marcar = () => {
    if (!candidato) return;
    const antes = new Set(insignias(viajes, hoy, servicio).filter((i) => i.lograda).map((i) => i.id));
    const nuevos = agregarViaje(viajes, candidato);
    const nueva = insignias(nuevos, hoy, servicio).find((i) => i.lograda && !antes.has(i.id));
    registrar(candidato);
    navigator.vibrate?.([30, 40, 60]);
    setFiesta(nueva ? `¡Insignia nueva: ${nueva.nombre}!` : `¡Buen viaje! Racha: ${racha(nuevos, hoy, servicio)} ${racha(nuevos, hoy, servicio) === 1 ? "día" : "días"}.`);
  };

  return (
    <section class="tarjeta viajes" aria-labelledby="t-viajes">
      {fiesta && <Confeti />}
      <div class="viajes-cabeza">
        <h2 id="t-viajes">Mis viajes</h2>
        <a href={enlace("viajes")}>Ver insignias</a>
      </div>
      <div class="marcador">
        <div class={`racha ${dias > 0 ? "viva" : ""}`}>
          <span class="llama" aria-hidden="true">
            {dias > 0 ? "🔥" : "💤"}
          </span>
          <strong data-testid="racha">{dias}</strong>
          <span>{dias === 1 ? "día de racha" : "días de racha"}</span>
        </div>
        <div class="racha">
          <span class="llama" aria-hidden="true">
            🚌
          </span>
          <strong data-testid="total-viajes">{viajes.length}</strong>
          <span>{viajes.length === 1 ? "viaje" : "viajes"}</span>
        </div>
      </div>
      {candidato ? (
        <button class="boton abordar" type="button" onClick={marcar} disabled={hecho}>
          {hecho ? `✓ Viaje de las ${formatoHora(candidato.minutos)} registrado` : `Voy en el bus de las ${formatoHora(candidato.minutos)}`}
        </button>
      ) : (
        <p class="suave chico">
          {dias > 0 && !viajoHoy && servicio(hoy)
            ? "Registre un viaje hoy para mantener su racha. El botón aparece 10 minutos antes de cada salida."
            : "Podrá registrar su viaje desde 10 minutos antes de cada salida."}
        </p>
      )}
      <p class="fiesta" role="status">
        {fiesta}
      </p>
    </section>
  );
}

function Medalla({ i }: { i: Insignia }) {
  return (
    <li class={`medalla ${i.lograda ? "lograda" : ""}`}>
      <span class="sello" aria-hidden="true">
        {i.lograda ? "★" : "☆"}
      </span>
      <div>
        <strong>{i.nombre}</strong>
        <span class="suave chico">{i.detalle}</span>
        <progress max={1} value={i.avance} aria-label={`Avance de ${i.nombre}`} />
        <span class="oculto">{i.lograda ? "Lograda" : `Avance: ${Math.round(i.avance * 100)} por ciento`}</span>
      </div>
    </li>
  );
}

/** Página completa: resumen, insignias e historial. */
export function PanelViajes({ ciclo, ruta, ahora }: Base) {
  const [viajes, setViajes] = useState(leerViajes);
  const hoy = partesCR(ahora).fecha;
  const servicio = hayServicioEn(ciclo, ruta);
  const lista = insignias(viajes, hoy, servicio);
  const logradas = lista.filter((i) => i.lograda).length;
  const mes = viajes.filter((v) => v.fecha.slice(0, 7) === hoy.slice(0, 7)).length;
  const nombres = new Map(ciclo.rutas.map((r) => [r.id, `${corto(r.origen)} → ${corto(r.destino)}`]));
  return (
    <>
      <section class="tarjeta">
        <h2>Resumen</h2>
        <div class="marcador tres">
          <div class="racha viva">
            <strong>{racha(viajes, hoy, servicio)}</strong>
            <span>días de racha</span>
          </div>
          <div class="racha">
            <strong>{mes}</strong>
            <span>viajes este mes</span>
          </div>
          <div class="racha">
            <strong>{viajes.length}</strong>
            <span>viajes en total</span>
          </div>
        </div>
      </section>
      <section class="tarjeta">
        <h2>
          Insignias · {logradas} de {lista.length}
        </h2>
        <ul class="medallas">
          {lista.map((i) => (
            <Medalla key={i.id} i={i} />
          ))}
        </ul>
      </section>
      <section class="tarjeta pila">
        <h2>Últimos viajes</h2>
        {viajes.length === 0 ? (
          <p class="suave">Todavía no ha registrado viajes. En Inicio, toque «Voy en el bus» cuando vaya a abordar.</p>
        ) : (
          <ul class="pila">
            {viajes.slice(-10).reverse().map((v) => (
              <li key={`${v.fecha}-${v.ruta}-${v.minutos}`}>
                <strong>{formatoHora(v.minutos)}</strong> · {diaRelativo(hoy, v.fecha).replace(/^el /, "")} ·{" "}
                <span class="suave">{nombres.get(v.ruta) ?? v.ruta}</span>
              </li>
            ))}
          </ul>
        )}
        <p class="suave chico">Sus viajes se guardan solo en este dispositivo. Nadie más los ve.</p>
        {viajes.length > 0 && (
          <div>
            <button
              class="boton secundario"
              type="button"
              onClick={() => {
                if (confirm("¿Borrar todos sus viajes e insignias? No se puede deshacer.")) {
                  guardarViajes([]);
                  setViajes([]);
                }
              }}
            >
              Borrar mis viajes
            </button>
          </div>
        )}
      </section>
    </>
  );
}
