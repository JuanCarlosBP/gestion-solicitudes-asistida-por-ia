# AG-016 — Evidencia del frontend008

Estado: implementación local con comprobaciones frontend superadas. E2E real,
revisión independiente final y aceptación humana pendientes de consolidación.
Writer: implementador frontend; root conserva Docker, SDD, MEMORY e informe global.

Fuentes: AGENTS/MEMORY, encargo AG-016, SDD008 especificación/plan/tareas,
ADR0009, política de seguridad/calidad y skill verificación QA. No Git, Docker,
nuevas dependencias, lockfiles, migraciones ni cambios fuera de rutas asignadas.

## Cambios

- `/demo`: presentación, disponibilidad, reserva exclusiva, caducidad y liberación,
  tres guías de cuatro pasos, acceso real por rol; sin cuenta administradora.
- Selector público validado en `sessionStorage` por pestaña. La autoridad sigue
  siendo cookie HttpOnly + servidor. No se guardan credenciales ni cuerpos.
- Cabecera limitada a `/api/` del mismo origen; no Bearer en demo/auth/salud.
  Respuestas de contexto o sesión anterior se rechazan antes del consumidor.
- Cambio de rol espera refresh, revoca mediante `/api/autenticacion/cerrar-sesion`
  (la cookie refresh tiene ese Path), obtiene CSRF nuevo y autentica. Si revocar
  falla, el siguiente intento sigue exigiendo revocación. Una respuesta perdida
  del acceso también deja pendiente revocar su posible cookie. Nunca simula identidad.
- Ámbitos de memoria, descriptor y Web Locks incluyen reserva/generación/usuario;
  un cálculo asíncrono antiguo no inicia una consulta en el ámbito nuevo.
- Enlaces en navegación e inicio. El enlace de inicio va después de la consulta
  técnica para conservar el recorrido de teclado de la E2E original.
- `E2E_DEMO=1` selecciona únicamente demo; por defecto continúan las 33 E2E
  originales. Ninguna aserción original fue modificada.

## Comprobaciones ejecutadas

Entorno Windows, Node v24.13.0, npm 11.6.2. Comandos desde `frontend/`.
Los logs conservan sus fechas observadas. Primera ejecución enfocada: 2026-10-16
12:57:52 Europe/Madrid; última prueba enfocada: 13:06:20. Cierre de este paquete:
2026-10-16T11:06:41Z (13:06:41 Europe/Madrid). No se presenta esta ventana como
duración total de implementación ni medición de capacidad.

| Esperado / criterio | Ejecutado | Observado / evidencia |
|---|---|---|
| Compilación de tipos | `npm run typecheck` | PASS; `typecheck-acceso-incierto-cierre.log` |
| Lint sin avisos | `npm run lint`; comprobación enfocada de prueba añadida al cierre | PASS; `lint-final.log`, `lint-operaciones-cierre.log` |
| Formato coherente | `npm run format:check` | PASS; `formato-cierre.log` |
| Build producción | `npm run build` | PASS; 475,64 kB iniciales, sin aviso de presupuesto; `build-acceso-incierto-cierre.log` |
| AIS02/05, DO01/03/05: contexto, credenciales efímeras, roles, concurrencia | `npm test` con TEMP/TMP dentro del workspace | 520/520 PASS en 28 archivos; 479 originales + 41 nuevas; `unitarias-completas-final.log` |
| Inicio tras recolocar enlace, conservando foco original | `npm test -- --include='src/app/inicio/*.spec.ts'` | 13/13 PASS; `unitarias-inicio-cierre.log` |
| Carrera de cálculo de ámbito antiguo | `npm test -- --include='src/app/demo/demo-operaciones.spec.ts'` | 2/2 PASS; `unitarias-operaciones-02.log` |
| Cierre tras respuesta de login perdida y regresión de acceso original | `npm test -- --include='src/app/demo/*.spec.ts' --include='src/app/identidad/autenticacion.spec.ts'` | 54/54 PASS tras el último ajuste; `unitarias-acceso-incierto-cierre.log`. Incluye 42 casos demo y 12 originales de autenticación. |
| Selección de ambas suites E2E | `npx playwright test --list`, con/sin `E2E_DEMO=1` | 33 originales / 1 demo compuesta; logs `e2e-*-listado.log`. Listar no ejecuta E2E. |

La suite completa se repitió al añadir la prueba de carrera asíncrona y comprobar
el flujo de revocación; después se comprobó inicio por el cambio de posición de
su enlace. El último ajuste conserva la revocación tras un acceso de respuesta
incierta: se verificó con 54 casos enfocados, lint y formato de los dos archivos,
tipos y build. No se afirma haber ejecutado 521 casos en una única suite final:
la completa ejecutada tenía 520; el caso adicional se ejecutó en la enfocada.

## Incidencia de entorno conservada

`unitarias-demo-01.log`: compiló pero Vitest falló antes de ejecutar (0 pruebas),
por EPERM al renombrar su caché en Temp del sandbox. No fue un fallo de producto.
La corrección consistió en definir TEMP y TMP para ese proceso como la ruta
absoluta `frontend/.angular/ag016-temp`, dentro del workspace. El runner pasó
38/38 en `unitarias-demo-02.log`, y después las suites ampliadas. No elevación,
modificación del sandbox, reintentos indiscriminados ni alteración de aserciones.

## Pendiente y siguiente paso

Root ejecutará `E2E_DEMO=1 npm run test:e2e` con BASE_URL del laboratorio AG-016,
tres espacios LISTO y rutas de resultados/capturas nuevas. El test reserva tres,
rechaza al cuarto, crea/edita/presenta/aprueba, consulta como auditor, comprueba
JWT anterior revocado, aislamiento A/B, selector ausente/manipulado, recarga y
cookie ajena en pestaña antigua. Libera las tres reservas tras éxito. Si falla,
conserva el estado para diagnóstico y root gestiona el ciclo seguro del laboratorio.

Hasta ejecutar E2E no se acreditan comportamiento del navegador real, contratos
integrados, accesibilidad visual, cookies efectivas ni revocación real de sid.
Caducidad del temporizador y descarte de respuestas están probados unitariamente;
caducidad/reciclaje/reinicio reales pertenecen a QA de integración del coordinador.

`fuentes-sha256.csv` identifica las 22 fuentes tocadas; excluye deliberadamente
este informe, logs, el propio CSV y artefactos generados (sin autorreferencias).
Los directorios `.angular`, `dist` y `node_modules` son artefactos locales, no
fuentes para el manifiesto. Mensaje sugerido: `feat(demo): incorporar reserva y
recorrido aislado por roles en Angular`.
