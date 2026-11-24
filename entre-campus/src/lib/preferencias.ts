/** Preferencias guardadas en el dispositivo. Todo acceso a localStorage tolera fallos. */
export type Tema = "auto" | "claro" | "oscuro";

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}
function guardar(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* modo privado o almacenamiento bloqueado */
  }
}

export const leerRuta = (): string | null => leer("ec:ruta");
export const guardarRuta = (id: string): void => guardar("ec:ruta", id);

export function leerTema(): Tema {
  const t = leer("ec:tema");
  return t === "claro" || t === "oscuro" ? t : "auto";
}
export function aplicarTema(t: Tema): void {
  guardar("ec:tema", t);
  const raiz = document.documentElement;
  if (t === "auto") raiz.removeAttribute("data-tema");
  else raiz.setAttribute("data-tema", t);
  const oscuro = t === "oscuro" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", oscuro ? "#0f1517" : "#0b6e69");
}

/** Minutos que la persona tarda en llegar a la parada (0 = sin consejo). */
export function leerCaminata(): number {
  const n = Number(leer("ec:caminata"));
  return Number.isFinite(n) && n >= 0 && n <= 60 ? n : 0;
}
export const guardarCaminata = (min: number): void => guardar("ec:caminata", String(min));
