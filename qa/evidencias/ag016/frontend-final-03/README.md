# AG-016 — Contador de reserva y congelado frontend03

La captura de escritorio de `e2e-demo-final-02` mostró 61 min restantes justo
después de una reserva de 60 min. La señal ahora conservaba una muestra anterior
a recibir la reserva; al redondear hacia arriba, esa diferencia añadía un minuto.

Se reprodujo con reloj controlado: página abierta antes de reservar, respuesta
con 60 min desde su recepción; el resultado anterior era 61. Evidencia roja
`../frontend-reloj-reproduccion-01.log`: 4 PASS / 1 FAIL. No cambió el TTL del backend.

Corrección mínima en `demo-pagina.ts`: actualizar ahora con Date.now() en la
recepción correcta de la reserva. El nuevo caso de `demo-pagina.spec.ts` exige
60 inmediatamente y 59 después de un minuto. No se limita artificialmente el número
a 60 ni se altera la fecha de caducidad, el selector, la autenticación o el arnés.

## Comprobaciones

Ventanas observadas el 16/10/2026: 14:00:03–14:00:25 y 14:01:06–14:01:18
Europe/Madrid. Windows, Node 24.13.0; TEMP/TMP de pruebas dentro del workspace.
Logs y fechas ISO en `ejecuciones.json` y `unitarias-completas-ejecucion.json`.

| Comando desde frontend/ | Resultado observado |
|---|---|
| npm run test -- --include=src/app/demo/*.spec.ts | 43/43 PASS, 5 archivos; incluye reproducción corregida. |
| npm run test | 525/525 PASS, 28 archivos; Vitest 6,76 s. |
| npm run typecheck | PASS aplicación, unitarias y E2E. |
| npm run lint | PASS sin avisos. |
| npm run format:check | PASS. |
| npm run build | PASS; 475,87 kB iniciales; main-CZHJR3UU.js. |

La suite completa posterior al ajuste visual terminó con código 0 y 525 pruebas
superadas, según `unitarias-completas.log`. El coordinador confirmó la construcción
de la imagen 03 y está ejecutando E2E demo y las 33 originales; sus resultados
corresponden a sus evidencias y no se anticipan aquí.

`fuentes-sha256.csv` conserva 25 fuentes actualizadas; `artefactos-sha256.json`
identifica los tres archivos browser. E2E y selector mantienen sus huellas del
congelado 02. Sin Docker ni Git por este implementador. No aceptación humana
ni acreditación de carga o publicación por estas comprobaciones.

## Hallazgo posterior

La revisión de las capturas reales `e2e-demo-final-03/frontend-demo-escritorio.png`
y `frontend-demo-movil.png` volvió a mostrar 61 min. El ajuste descrito arriba
no resolvió ese resultado visual; las pruebas anteriores se conservan como
ejecutadas y no acreditan el contador. El diagnóstico, segunda corrección y
pruebas posteriores están en `../frontend-final-04/README.md`.
