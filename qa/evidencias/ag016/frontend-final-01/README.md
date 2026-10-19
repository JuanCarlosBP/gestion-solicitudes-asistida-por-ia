# AG-016 — Validación frontend final del 16/10/2026

Fuentes congeladas después de incorporar la instrumentación E2E y dos pruebas
integradas DOM→PUT. No hubo corrección de producto en este relevo. No Git ni
Docker ejecutados por el implementador frontend.

## Comprobaciones observadas

Ejecución local Windows, Node24.13.0; TEMP/TMP de pruebas dentro de
`frontend/.angular/ag016-temp`. Ventana observada de comandos:13:38:48–13:40:11
Europe/Madrid. Las fechas ISO y salidas completas están en `ejecuciones.json`
y en los cinco logs de este directorio.

| Comando desde frontend/ | Observado |
|---|---|
| npm run test | PASS:523/523,28 archivos;479 originales y44 adicionales. Duración Vitest22,89s. |
| npm run typecheck | PASS: aplicación, unitarias y E2E. |
| npm run lint | PASS: cero avisos. |
| npm run format:check | PASS. |
| npm run build | PASS: producción; artefactos en frontend/dist/gestion-solicitudes-frontend/browser. |

`fuentes-sha256.csv` contiene23 fuentes: las22 del relevo inicial y
`solicitudes-paginas.spec.ts`, al que se añadieron dos casos sin modificar las
aserciones anteriores. `artefactos-sha256.json` identifica el directorio browser
completo. Ambos excluyen sus propias huellas y este informe.

## Diagnóstico conservado

E2E demo01/02 fallaron al presentar; la petición persistió referencias nulas.
La espera añadida por el coordinador no resolvió el fallo. La instrumentación
añadida registra exclusivamente clases de error cerradas y presencia/tipo de
campos del PUT; no guarda cuerpos, cookies, tokens ni identificadores.

La ejecución del coordinador `e2e-demo-diagnostico-04` pasó sin cambiar producto.
Su JSON confirma proveedor/supervisor UUID presentes y un concepto en el PUT.
Ese PASS corresponde únicamente a esa ejecución: la causa anterior sigue
indeterminada y las evidencias fallidas se conservan.

Posible ventana aún no demostrada: el estado visual disabled del selector y
la guardia buscando() pueden observarse en momentos distintos alrededor de una
respuesta asíncrona. El valor DOM por sí solo no demuestra que el modelo recibió
el output. Las dos nuevas pruebas cubren DOM→PUT con entrada directa al editor
y después de crear; ambas pasan tras estabilizar el render. No prueban esa
hipótesis temporal del navegador real ni justifican modificar producto.

El primer montaje del caso unitario crear→editar consultó HTTP antes del
detectChanges que inicializa el nuevo componente: falló por ausencia de la
petición esperada. Se ajustó únicamente el montaje; después42/42 casos enfocados
y esta suite completa523/523 pasaron. No se atribuye ese fallo al producto.

## Arnés y pendientes

El protocolo exige rechazos de sobrecupo durante pico. `carga.mjs` programa dos
ráfagas de tres clientes nuevos a minutos41 y43, fuera del tráfico útil, con409
DEMO_CAPACIDAD_OCUPADA obligatorio y sin cookie de reserva. Un429 no sustituye
esa comprobación. Ventanas65min, mezcla útil y umbrales permanecen iguales.

La evidencia `../carga-sobrecupo-estatico-01.json` contiene seis comprobaciones
offline con dobles y hashes. No acredita ejecución HTTP, carga ni capacidad.
El coordinador ejecutará el modo arnés y las cuatro pasadas oficiales con sus
recursos y métricas. Revisión independiente, consolidación y aceptación humana
permanecen fuera del resultado de estos comandos.
