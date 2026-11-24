import { useEffect, useState } from "preact/hooks";
import { BandaConexion } from "./components/piezas";
import { useApp } from "./estado";
import { aplicarTema, leerTema, type Tema } from "./lib/preferencias";
import { AcercaDe } from "./pages/AcercaDe";
import { Avisos } from "./pages/Avisos";
import { Horarios } from "./pages/Horarios";
import { Inicio } from "./pages/Inicio";
import { Instalar } from "./pages/Instalar";
import { Mas } from "./pages/Mas";
import { Notificaciones } from "./pages/Notificaciones";
import { Paradas } from "./pages/Paradas";
import { enlace, PAGINAS, useLugar, type Pagina } from "./rutas";

const VISTAS: Record<Pagina, () => preact.JSX.Element> = {
  "": Inicio,
  horarios: Horarios,
  paradas: Paradas,
  avisos: Avisos,
  mas: Mas,
  instalar: Instalar,
  notificaciones: Notificaciones,
  acerca: AcercaDe,
};

const ICONOS: Record<string, string> = {
  "": "M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10",
  horarios: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  paradas: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.400-6.500 11-6.500 11Zm0-8.500a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5Z",
  avisos: "M6 16.500V11a6 6 0 1 1 12 0v5.500l1.500 2h-15l1.500-2ZM10 20.500a2 2 0 0 0 4 0",
  mas: "M5 12h.01M12 12h.01M19 12h.01",
};
const NAV: Pagina[] = ["", "horarios", "paradas", "avisos", "mas"];
const EN_MAS: Pagina[] = ["mas", "instalar", "notificaciones", "acerca"];

const SIGUIENTE: Record<Tema, Tema> = { auto: "claro", claro: "oscuro", oscuro: "auto" };
const NOMBRE_TEMA: Record<Tema, string> = { auto: "automático", claro: "claro", oscuro: "oscuro" };
const ICONO_TEMA: Record<Tema, string> = {
  auto: "M12 3a9 9 0 1 0 0 18V3Zm0 0a9 9 0 0 1 0 18",
  claro: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M3 12h2m14 0h2M5.600 5.600 7 7m10 10 1.400 1.400M5.600 18.400 7 17M17 7l1.400-1.400",
  oscuro: "M20 14.500A8.500 8.500 0 0 1 9.500 4a8.500 8.500 0 1 0 10.500 10.500Z",
};

function Icono({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function App() {
  const { pagina, params } = useLugar();
  const { elegirRuta } = useApp();
  const [tema, setTema] = useState<Tema>(leerTema);
  const Vista = VISTAS[pagina];

  useEffect(() => aplicarTema(tema), [tema]);
  useEffect(() => {
    document.title = pagina === "" ? "Entre Campus · Bus interno UNA" : `${PAGINAS[pagina]} · Entre Campus`;
    scrollTo(0, 0);
  }, [pagina]);
  // Las notificaciones abren la app en #/?ruta=od-bn
  const rutaPedida = params.get("ruta");
  useEffect(() => {
    if (rutaPedida) elegirRuta(rutaPedida);
  }, [rutaPedida, elegirRuta]);

  return (
    <>
      <header class="cabecera">
        <a class="marca" href={enlace("")}>
          <img src={`${import.meta.env.BASE_URL}icons/icono.svg`} alt="" width="30" height="30" />
          <span>
            Entre Campus<small>Bus interno UNA · no oficial</small>
          </span>
        </a>
        <button
          class="boton-icono"
          type="button"
          onClick={() => setTema(SIGUIENTE[tema])}
          aria-label={`Tema: ${NOMBRE_TEMA[tema]}. Cambiar a ${NOMBRE_TEMA[SIGUIENTE[tema]]}`}
          title={`Tema ${NOMBRE_TEMA[tema]}`}
        >
          <Icono d={ICONO_TEMA[tema]} />
        </button>
      </header>
      <BandaConexion />
      <main id="contenido" tabIndex={-1}>
        <Vista key={pagina} />
      </main>
      <nav class="nav" aria-label="Principal">
        <ul>
          {NAV.map((p) => {
            const actual = p === pagina || (p === "mas" && EN_MAS.includes(pagina));
            return (
              <li key={p}>
                <a href={enlace(p)} aria-current={actual ? "page" : undefined}>
                  <Icono d={ICONOS[p]!} />
                  {PAGINAS[p]}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
