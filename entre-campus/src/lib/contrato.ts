/** Contrato compartido entre la app y el Worker de notificaciones. */
import { z } from "zod";

export const TipoAviso = z.enum(["salida10", "salida5", "franja10"]);
export type TipoAviso = z.infer<typeof TipoAviso>;

export const Suscripcion = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(2048),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(64) }),
});
export type Suscripcion = z.infer<typeof Suscripcion>;

export const PeticionSuscribir = z.object({
  suscripcion: Suscripcion,
  ruta: z.string().regex(/^[a-z0-9-]{1,32}$/),
  tipos: z.array(TipoAviso).min(1).max(3),
});
export type PeticionSuscribir = z.infer<typeof PeticionSuscribir>;

export const PeticionDesuscribir = z.object({ endpoint: z.string().min(1).max(2048) });

/** Carga útil del push que recibe el service worker. */
export interface MensajePush {
  titulo: string;
  cuerpo: string;
  ruta: string;
  etiqueta: string;
}
