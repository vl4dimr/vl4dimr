/** Valida todos los JSON de public/data con el esquema Zod. Se ejecuta antes de compilar y en CI. */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { Ciclo, Indice } from "../src/lib/esquema";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../public/data");
const leer = (n: string): unknown => JSON.parse(readFileSync(join(dir, n), "utf8"));
const errores: string[] = [];
const revisar = <T>(nombre: string, esquema: z.ZodType<T>): T | null => {
  try {
    const r = esquema.safeParse(leer(nombre));
    if (r.success) return r.data;
    errores.push(`${nombre}:\n${z.prettifyError(r.error)}`);
  } catch (e) {
    errores.push(`${nombre}: ${(e as Error).message}`);
  }
  return null;
};

const indice = revisar("index.json", Indice);
for (const archivo of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "index.json")) {
  const c = revisar(archivo, Ciclo);
  const ref = indice?.ciclos.find((x) => x.archivo === archivo);
  if (!c) continue;
  if (!ref) errores.push(`${archivo}: no aparece en index.json`);
  else if (ref.ciclo !== c.ciclo || ref.inicio !== c.vigencia.inicio || ref.fin !== c.vigencia.fin) {
    errores.push(`${archivo}: ciclo o vigencia no coinciden con index.json`);
  }
}
for (const ref of indice?.ciclos ?? []) {
  try {
    leer(ref.archivo);
  } catch {
    errores.push(`index.json: falta el archivo ${ref.archivo}`);
  }
}

if (errores.length) {
  console.error(`✖ Datos inválidos\n\n${errores.join("\n\n")}`);
  process.exit(1);
}
console.log("✔ Datos válidos");
