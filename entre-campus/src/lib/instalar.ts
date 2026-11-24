/** Captura el evento beforeinstallprompt para ofrecer la instalación desde la app. */
interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let pendiente: EventoInstalar | null = null;
const oyentes = new Set<() => void>();

addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  pendiente = e as EventoInstalar;
  oyentes.forEach((f) => f());
});
addEventListener("appinstalled", () => {
  pendiente = null;
  oyentes.forEach((f) => f());
});

export const puedeInstalar = (): boolean => pendiente !== null;
export function alCambiarInstalacion(f: () => void): () => void {
  oyentes.add(f);
  return () => oyentes.delete(f);
}
export async function pedirInstalacion(): Promise<boolean> {
  if (!pendiente) return false;
  await pendiente.prompt();
  const { outcome } = await pendiente.userChoice;
  pendiente = null;
  oyentes.forEach((f) => f());
  return outcome === "accepted";
}
