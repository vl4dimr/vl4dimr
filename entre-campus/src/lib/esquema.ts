import { z } from "zod";

const Fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use AAAA-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Fecha inválida");

const Hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24 h)");

export const GrupoDias = z.enum(["lunes-viernes", "sabado", "domingo"]);
export type GrupoDias = z.infer<typeof GrupoDias>;

export const Franja = z
  .object({
    nombre: z.string().min(1),
    inicio: Hora,
    fin: Hora,
    frecuenciaMin: z.number().int().positive().max(240),
  })
  .strict()
  .refine((f) => f.inicio < f.fin, "inicio debe ser anterior a fin");
export type Franja = z.infer<typeof Franja>;

const Franjas = z.array(Franja).superRefine((fs, ctx) => {
  for (let i = 1; i < fs.length; i++) {
    if (fs[i]!.inicio < fs[i - 1]!.fin) {
      ctx.addIssue({ code: "custom", message: "Franjas traslapadas o desordenadas", path: [i] });
    }
  }
});

export const Ruta = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    origen: z.string().min(1),
    destino: z.string().min(1),
    duracionEstimadaMin: z.number().int().positive().max(180),
    franjas: z.partialRecord(GrupoDias, Franjas),
    /** Si hay horas para un grupo de días, mandan sobre frecuenciaMin. null = generar por frecuencia. */
    salidasExactas: z.partialRecord(GrupoDias, z.array(Hora).min(1)).nullable(),
  })
  .strict();
export type Ruta = z.infer<typeof Ruta>;

export const Excepcion = z
  .object({
    fecha: Fecha,
    tipo: z.enum(["sin_servicio"]),
    motivo: z.string().min(1),
  })
  .strict();
export type Excepcion = z.infer<typeof Excepcion>;

export const Parada = z
  .object({
    id: z.string().min(1),
    nombre: z.string().min(1),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    verificada: z.boolean(),
    foto: z.string().nullable(),
    referencia: z.string().nullable().optional(),
  })
  .strict();
export type Parada = z.infer<typeof Parada>;

export const Aviso = z
  .object({
    id: z.string().min(1),
    nivel: z.enum(["info", "advertencia", "critico"]),
    texto: z.string().min(1),
    desde: Fecha,
    hasta: Fecha,
  })
  .strict()
  .refine((a) => a.desde <= a.hasta, "desde debe ser ≤ hasta");
export type Aviso = z.infer<typeof Aviso>;

export const Ciclo = z
  .object({
    ciclo: z.string().min(1),
    /** true = datos de muestra, no oficiales. La app lo advierte en pantalla. */
    ejemplo: z.boolean().default(false),
    vigencia: z
      .object({ inicio: Fecha, fin: Fecha })
      .strict()
      .refine((v) => v.inicio <= v.fin, "inicio debe ser ≤ fin"),
    fuente: z.string().min(1),
    actualizado: Fecha,
    rutas: z.array(Ruta).min(1),
    excepciones: z.array(Excepcion),
    paradas: z.array(Parada),
    avisos: z.array(Aviso),
  })
  .strict()
  .superRefine((c, ctx) => {
    for (const campo of ["rutas", "paradas", "avisos"] as const) {
      const ids = c[campo].map((x) => x.id);
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({ code: "custom", message: `IDs duplicados en ${campo}`, path: [campo] });
      }
    }
  });
export type Ciclo = z.infer<typeof Ciclo>;

export const Indice = z
  .object({
    activo: z.string().min(1),
    ciclos: z
      .array(
        z
          .object({
            ciclo: z.string().min(1),
            archivo: z.string().regex(/^[\w.-]+\.json$/),
            inicio: Fecha,
            fin: Fecha,
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .refine((i) => i.ciclos.some((c) => c.ciclo === i.activo), "El ciclo activo no está en la lista");
export type Indice = z.infer<typeof Indice>;
