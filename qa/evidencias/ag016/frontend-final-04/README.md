# AG-016 — Segundo ajuste del contador y congelado frontend 04

La revisión visual de las dos capturas de `e2e-demo-final-03` volvió a observar
**61 min restantes** para la duración anunciada de 60 minutos. Por tanto, la
primera corrección del contador no resolvió el resultado real, aunque sus
unitarias y la E2E anterior pasaran. Aquella E2E no tenía una aserción del contador.
Se conservan los resultados y capturas anteriores. El coordinador interrumpió
A1 antes de modificar esta versión; su ejecución no constituye una pasada válida.

## Causa cubierta y reparación autorizada

La API devuelve una caducidad calculada con el reloj del servidor. El componente
la restaba del reloj del navegador y aplicaba `ceil`. La primera corrección
actualizaba una muestra local antigua, pero no consideraba el desfase entre
relojes: 60 minutos más 250 ms se mostraban como 61. Esta posibilidad está
reproducida de forma determinista; las evidencias previas no medían el desfase
real entre ambos relojes y no permiten fijar su magnitud ni su origen.

La segunda reparación aplica `max(0, min(ceil(restante), duracionMinutos))`, usando
la duración anunciada por `/api/demo`, sin una constante de 60 minutos. La fecha
`expiraEn` y la caducidad efectiva permanecen intactas. Se mantiene la actualización
de la muestra al recibir la reserva. El indicador sigue dependiendo del reloj
del navegador para el descenso; este ajuste evita anunciar más tiempo que la
duración permitida, no sincroniza relojes ni amplía la reserva.

Archivos modificados:

- `frontend/src/app/demo/demo-pagina.ts`: límite superior obtenido de la API.
- `frontend/src/app/demo/demo-pagina.spec.ts`: tres casos con desfases de 250 ms
  y 30 s, duraciones de 60 y 30 minutos, caducidad intacta y descenso posterior.
- `frontend/e2e/demo-aislamiento.spec.ts`: exige exactamente `60 min` para las
  tres reservas y antes de ambas capturas; prohíbe `61 min` al reservar. Registra
  fecha cliente, fecha HTTP, caducidad pública y diferencia temporal, sin secretos
  ni identificadores de reserva. Conserva todas las aserciones de negocio previas.

## Comprobaciones observadas

Windows, Node v24.13.0; TEMP/TMP dentro del workspace. Ejecución final del
16/10/2026, 14:15:19–14:15:52 Europe/Madrid. Fechas y códigos en `ejecuciones.json`.

| Comprobación | Resultado |
|---|---|
| Reproducción antes de la segunda corrección | 5 PASS / 3 FAIL; 61 frente a 60 y 31 frente a 30. Log `../frontend-reloj-reproduccion-02.log`. |
| `npm run test -- --include=src/app/demo/*.spec.ts` | 46/46 PASS, 5 archivos. |
| `npm run test` | 528/528 PASS, 28 archivos; Vitest 6,96 s. |
| `npm run typecheck` | PASS aplicación, unitarias y E2E. |
| `npm run lint` | PASS sin avisos. |
| `npm run format:check` | PASS. |
| `npm run build` | PASS; 475,94 kB iniciales, `main-I52BMCA5.js`. |

El descenso se comprueba con reloj simulado en pruebas unitarias, incluido el
caso de 60 a 59 después de un minuto con relojes alineados. No se simula el reloj
de Playwright ni se presenta esta prueba como espera real de un minuto.

`fuentes-sha256.csv` identifica 25 fuentes; `artefactos-sha256.json` identifica
los archivos browser. Main SHA-256:
`fde6f9cb7f6dee844073e22086a98a7fc8e0cb6a0da748acb696545f99e860fa`.
E2E SHA-256: `7754ef958ab21f866597e3ff315b6d87fcf35afc8bdb898dfa72a4ab29b03564`.

El coordinador tiene la versión congelada para construir la imagen y ejecutar
la E2E con capturas reales. Su resultado sigue pendiente en este informe. Si la
segunda corrección falla en el mismo contador, procede detener esa parte y pedir
decisión humana. No se declara aquí aceptación ni resultado de dimensionamiento.
No se cambió el arnés ni se ejecutaron Docker o Git por este implementador.
