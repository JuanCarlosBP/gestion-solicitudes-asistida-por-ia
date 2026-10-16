# AG-011 — implementación y verificación frontend

Fecha: 2026-10-14, Europe/Madrid. Escritor: implementador frontend.
Alcance: PR-T06/PR-T07; `frontend/**` y evidencia `frontend-*` AG-011.
Permiso observado: workspace-write, sin aislamiento técnico por nombre de rol.
Sin Git, Docker, cambios de históricos ni escritura en archivos de otros agentes.

## Implementado

- Contrato tipado, API con seis campos editables y versión en operaciones posteriores.
- Cuatro rutas: lista, alta, detalle y edición. Guards y controles por unión de roles.
- Lista con filtros AND en URL, orden cerrado, páginas, carga/vacío/error y reintento.
- Filtros conservados al navegar a alta, detalle, edición y retorno al catálogo.
- Página fuera de resultados vacía; Anterior recupera última página disponible.
- Formulario validado, errores asociados a campos, entrada conservada tras error.
- Desactivación/reactivación con versión; conflicto bloquea nuevo envío hasta recargar.
- Foco tras render, etiquetas, avisos semánticos, estilos de foco y diseño adaptable.
- Sesión, Bearer y XSRF existentes; sin almacenamiento web ni librería visual añadida.

Archivos propios: `frontend/src/app/proveedores/*`, `frontend/e2e/proveedores.spec.ts`;
actualizados `frontend/src/app/app.ts`, `app.html`, `app.routes.ts` y
`frontend/e2e/base.spec.ts` (expectativas OpenAPI para las rutas nuevas).
Huellas SHA-256 del código verificado: `frontend-huellas.json`.
Instantánea anterior al E2E: `frontend-huellas-pre-e2e.json` (18 archivos fuente).
Comparación posterior: `frontend-huellas-post-e2e.json`, PASS, 18 comparados,
cero diferencias. Las fuentes finales no cambiaron durante el E2E superado.

## Ejecutado y observado

Entorno: Windows, Angular 21, dependencias ya presentes; NG_CLI_ANALYTICS=false.
Caché npm: workspace/tmp/npm-cache. TEMP/TMP: workspace/tmp/pruebas-frontend.
Esperado para cada comando: exit 0 y ninguna comprobación obligatoria omitida.

| Comprobación | Observado | Evidencia |
|---|---|---|
| `npm run typecheck` final carga/foco | PASS, código/app/spec/E2E | frontend-typecheck-carga.log |
| `npm run lint` final carga/foco | PASS, cero avisos | frontend-lint-carga.log |
| `npm run format:check` final carga/foco | PASS | frontend-format-check-carga.log |
| `npm run build` final carga/foco | PASS, bundle inicial 310.44 kB | frontend-build-carga.log |
| `npm run test -- --include=src/app/proveedores/**/*.spec.ts` inicial | Entorno EPERM; cero pruebas ejecutadas | frontend-tests-enfocados.log |
| Mismo comando fuera del sandbox | PASS 68 pruebas iniciales | frontend-tests-enfocados-2.log |
| `npm run test` tras corrección de página fuera de rango | PASS 126 pruebas/13 suites (70 nuevas y 56 previas) | frontend-tests-regresion.log |
| `npm run test` final R00304 Unicode en búsqueda | PASS 129 pruebas/13 suites (73 nuevas y 56 previas) | frontend-tests-regresion-r00304.log |
| `npm run test` final carrera de carga/foco | PASS 130 pruebas/13 suites (74 nuevas y 56 previas) | frontend-tests-regresion-carga.log |
| `npm run test:e2e`, intento 01 | 1 PASS (API), 8 fallos de entorno: navegador buscado en AppData | frontend-e2e-intento01.log/.xml |
| `npm run test:e2e`, intento 02 | 8 PASS; proveedores falla en paso 10 tras pasar 01–09 | frontend-e2e-intento02.log/.xml |
| `npm run test:e2e`, intento 03 final | PASS 9/9; doce pasos proveedores completos sobre Compose real | frontend-e2e-intento03.log/.xml |

El primer fallo de pruebas provino de `fs.realpathSync.native` sobre dependencias
Angular locales, reproducido en un comando de diagnóstico. La ejecución escalada
fue autorizada por revisión automática y resolvió el entorno, manteniendo
temporales y resultados en workspace. No se modificaron controles del producto.

La primera compilación detectó unión de observables con sobrecarga incompatible
en formulario: se declaró `Observable<Proveedor | null>` antes de aplicar pipe.
Corrección única comprobada por typecheck y build posteriores.
La revisión detectó navegación a Nuevo sin preservar filtros; se corrigió el enlace
y se probó ida/vuelta. La auto-revisión corrigió Anterior desde página inexistente
y añadió dos pruebas. Ninguna prueba fallida se marca como superada por intención.

R00304 de revisión independiente: maxlength de filtros contaba UTF-16. Ahora los
techos físicos son 256/128 unidades; la validación TS cuenta caracteres Unicode
y aplica 128/64 antes de navegar. Tres pruebas nuevas verifican fiscal de 33 emojis,
denominación de 65 emojis y rechazo de 129/65 caracteres. El E2E incluye crear y
buscar valores Unicode suplementarios. Candidato de esa corrección: `main-O5VZ7EG7.js`.

El E2E 01 se corrigió con PLAYWRIGHT_BROWSERS_PATH=workspace/tmp/playwright,
instalación existente también usada por el script QA del proyecto; sin descargas.
E2E 02 ejecutó los ocho recorridos previos con éxito y los pasos 01–09 de
proveedores, pero la escritura inmediata en filtros durante carga perdió texto.
Diagnóstico DOM reproducible en `frontend-diagnostico-foco.log`: input 130/66
unidades, foco tardío al título y campo de denominación reinicializado a cero.
La captura `frontend-e2e-intento02-fallo.png` conserva el fallo.
Primera corrección del problema: fieldset deshabilitado y aria-busy durante carga;
submit bloqueado mientras carga. Nueva prueba verifica disponibilidad y entrada
tras carga. E2E no recibió esperas ni reintentos para ocultar la carrera.
Candidato final: `main-UBBPHK6T.js`; E2E intento 03 sobre esta imagen PASS 9/9.
La carrera se corrigió en la primera corrección verificada, sin esperas artificiales
ni reintentos. Se conservan el fallo de entorno y el fallo de producto por separado.

## Mapa de criterios

| Criterio | Prueba | Alcance real |
|---|---|---|
| PR-01/04/05/06 | proveedores-api.spec.ts | Métodos, rutas, cuerpos editables/versión y estados HTTP simulados |
| PR-03/10 | proveedores-paginas.spec.ts | URL/filtros/páginas/orden, cancelación previa, vacío/error/reintento |
| PR-08/10 | proveedores-paginas.spec.ts | Unión de roles, guards de alta/edición, botones y filtro de inactivos |
| PR-09/10 | proveedores-paginas.spec.ts | Conflicto de edición/estado, entrada preservada y recarga |
| PR-10/11 | proveedor-validacion.spec.ts | ISO, Unicode/límites, campos inválidos, errores sin datos reflejados |
| PR-10/12 | proveedores.spec.ts | Doce pasos E2E ejecutados PASS, sin mocks: API/PostgreSQL Compose |
| Regresión 001/002 | Suites existentes incluidas en `npm run test` | 56 pruebas previas conservadas y superadas |

Las pruebas Angular simuladas no demuestran autorización ni persistencia backend.
Estas garantías requieren las evidencias HTTP/PostgreSQL del otro implementador
y el recorrido E2E real.

## E2E y comprobación visual final

Doce pasos ejecutados: alta; detalle/lista; edición; conflicto en dos pestañas;
baja; ocultación a solicitante/supervisor; auditor lectura; reactivación;
duplicado; búsqueda Unicode/filtros/orden/páginas; recarga; móvil/teclado/foco/etiquetas.
POST/PUT observados llevan Bearer y XSRF; almacenamiento web permanece vacío.
El E2E de proveedores usa exclusivamente API y PostgreSQL reales. Entre los ocho
E2E heredados, uno conserva la simulación acotada de /salud 503 para probar error
y recuperación; esta simulación no se utiliza en el recorrido de proveedores.

Se abrieron y revisaron las cinco capturas finales con view_image:

- `frontend-proveedores-detalle-escritorio.png`: datos y acciones legibles.
- `frontend-proveedores-conflicto.png`: aviso, entrada conservada y recarga visibles.
- `frontend-proveedores-auditor.png`: estado inactivo y ausencia de acciones de escritura.
- `frontend-proveedores-lista-movil.png`: 375 px, filtros y Unicode se ajustan, sin recortes.
- `frontend-proveedores-formulario-movil.png`: aviso con foco, errores asociados y controles completos.

Observado: sin solapamientos ni desbordamiento horizontal en estas capturas;
Playwright comprueba también `scrollWidth <= innerWidth`, teclado y foco reales.
Esta inspección no acredita una auditoría completa WCAG ni todos los navegadores.

## Pendiente y siguiente paso

PR-T06/PR-T07 implementadas y verificadas en el alcance frontend. Sin pruebas
frontend obligatorias pendientes ni fallos finales abiertos conocidos.
Coordinador: incorporar evidencias al cierre y someterlas a revisión independiente.
Aceptación/integración/CI remota permanecen bajo decisión humana; no se ejecutó Git.
