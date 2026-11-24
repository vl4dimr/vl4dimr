import { Ciclo } from "../../src/lib/esquema";

const franjas = {
  "lunes-viernes": [
    { nombre: "Mañana", inicio: "06:00", fin: "08:00", frecuenciaMin: 30 },
    { nombre: "Mediodía", inicio: "12:00", fin: "14:00", frecuenciaMin: 30 },
    { nombre: "Noche", inicio: "17:00", fin: "20:00", frecuenciaMin: 30 },
  ],
};

/** Ciclo de prueba: lunes 2027-02-15 a viernes 2027-06-25. */
export const ciclo = Ciclo.parse({
  ciclo: "I-2027",
  ejemplo: true,
  vigencia: { inicio: "2027-02-15", fin: "2027-06-25" },
  fuente: "prueba",
  actualizado: "2027-02-01",
  rutas: [
    { id: "od-bn", origen: "Campus Omar Dengo", destino: "Campus Benjamín Núñez", duracionEstimadaMin: 20, franjas, salidasExactas: null },
    { id: "bn-od", origen: "Campus Benjamín Núñez", destino: "Campus Omar Dengo", duracionEstimadaMin: 25, franjas, salidasExactas: { "lunes-viernes": ["06:10", "07:40", "12:15", "19:55"] } },
  ],
  excepciones: [
    { fecha: "2027-03-25", tipo: "sin_servicio", motivo: "Jueves Santo" },
    { fecha: "2027-03-26", tipo: "sin_servicio", motivo: "Viernes Santo" },
  ],
  paradas: [],
  avisos: [
    { id: "a1", nivel: "info", texto: "Aviso de marzo", desde: "2027-03-01", hasta: "2027-03-05" },
    { id: "a2", nivel: "critico", texto: "Aviso crítico", desde: "2027-03-03", hasta: "2027-03-03" },
  ],
});
export const ruta = ciclo.rutas[0]!;
export const rutaExacta = ciclo.rutas[1]!;

/** Instante a partir de fecha y hora de Costa Rica (UTC-6 fijo), sin pasar por el código probado. */
export const cr = (fecha: string, hora: string): Date => new Date(`${fecha}T${hora.length === 5 ? hora + ":00" : hora}-06:00`);
