# Cómo colaborar

Gracias por ayudar a mantener Entre Campus al día. Este es un proyecto comunitario y no oficial.

## Reportar sin programar

Abra un issue con la plantilla que corresponda:

- **Horario cambió**: indique la ruta, la franja, el dato nuevo y la fuente (enlace o foto del comunicado).
- **Parada incorrecta**: indique la parada, la ubicación correcta y, si puede, una foto.
- **Bug**: qué esperaba, qué pasó, y en qué teléfono y navegador.

## Corregir datos

Los horarios están en `entre-campus/public/data/` y se editan sin tocar código. Siga la sección «Cómo actualizar el horario» del [README](README.md) y ejecute `npm run validar` antes de enviar el cambio. Indique siempre la fuente. No marque una parada como `"verificada": true` si no se comprobó en el sitio.

## Cambios de código

1. Cree una rama desde `main`.
2. `npm install` y `npm run dev` dentro de `entre-campus/`.
3. Antes de abrir el pull request, ejecute `npm run verificar`.

Criterios del proyecto:

- Textos en español de Costa Rica, con trato de **usted**.
- Toda la lógica de tiempo pasa por `src/lib/tiempo.ts` (zona `America/Costa_Rica`); no use la hora local del dispositivo.
- Los cálculos de horario son funciones puras en `src/lib/horario.ts` y llevan pruebas.
- La interfaz debe cumplir WCAG 2.2 AA: foco visible, contraste, uso con teclado y lector de pantalla. Las pruebas con axe no deben reportar errores.
- Sin rastreo, sin publicidad y sin claves ni secretos en el repositorio.
