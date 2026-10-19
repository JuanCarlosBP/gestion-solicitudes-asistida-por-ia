# AG-016 — Corrección del selector y validación frontend02

Estado al congelar: corrección y pruebas locales de frontend verificadas;
E2E con esta nueva imagen pendiente del coordinador. No aceptación humana.
Los fallos anteriores, frontend-final-01 y sus huellas permanecen intactos.

## Causa y evidencia

`e2e-demo-final-01` volvió a fallar después del PASS aislado de diagnóstico04:
el PUT contenía proveedor null y supervisor UUID. Ese PASS no había explicado
la causa y no se trató como resolución del defecto.

La traza del coordinador `e2e-demo-eventos-01`, del16/10/2026, permite relacionar
las observaciones. Hora UTC, dentro del mismo segundo11:52:55:

| Instante | Hecho observado |
|---|---|
| .217 | Finaliza GET detalle1; no queda una respuesta de detalle que sobrescriba el formulario durante la selección. |
| .228 | Finaliza GET proveedor1, automático al inicializar el selector. |
| .277/.278 | Clic Buscar proveedor e inicio de GET proveedor2. |
| .280 | La espera E2E resuelve con proveedor1, pues el predicado solo diferenciaba la ruta. |
| .288 | Evento change del proveedor; el DOM aún muestra el select habilitado. |
| .293 | Finaliza proveedor2, después del change. |
| .342/.349 | La espera del supervisor sí resuelve su GET2 y el change llega después. |
| .463 | PUT con proveedor null y supervisor UUID. |

La reproducción determinista en `solicitudes-editores.spec.ts` confirma el
mecanismo: buscar() activa la guardia antes del siguiente render; un change
durante esa ventana es rechazado, pero el DOM conservaba el UUID sin que el
modelo lo hubiera adoptado. Tras completar y renderizar la consulta, el modelo
seguía null y el select seguía mostrando el UUID. El caso falló con9/10PASS en
`../frontend-selector-reproduccion-01.log`; no se cambió producto para obtenerlo.

## Una corrección coherente

- `referencia-selector.ts` restaura el valor del select a la selección adoptada
  si la guardia rechaza el evento por búsqueda o bloqueo. No acepta una selección
  durante el bloqueo ni cambia permisos/contratos del backend.
- La E2E conserva la búsqueda, pero la respuesta se identifica mediante el
  nombre específico enviado, igual que en las E2E originales. Espera la respuesta
  de esa búsqueda; no añade sleeps, reintentos ni una repetición del gesto.
- Conserva validación UUID, presentación, decisión, roles y aislamiento. Añade
  además la comprobación de ambos IDs en la respuesta del PUT antes de presentar.
- La instrumentación sanitizada y los dos casos DOM→PUT anteriores se mantienen.
  Ninguna aserción de las33 E2E originales fue modificada por este implementador.

Esta es la segunda corrección del problema contando la espera de catálogo
anterior. Si la validación integrada vuelve a fallar por el mismo problema,
corresponde detener esta parte y solicitar decisión humana.

## Comprobaciones ejecutadas

Windows, Node24.13.0; TEMP/TMP dentro del workspace. Ventana observada de los
comandos finales13:54:37–13:55:03 Europe/Madrid. Comandos desde frontend/;
fechas ISO completas en `ejecuciones.json`.

| Comprobación | Observado |
|---|---|
| Editores y páginas tras corrección |52/52PASS; `../frontend-selector-correccion-01.log`. Incluye el caso antes rojo. |
| npm run test |524/524PASS en28archivos:479 originales y45 adicionales. Vitest7,47s. |
| npm run typecheck |PASS aplicación, pruebas unitarias y E2E. |
| npm run lint |PASS sin avisos. |
| npm run format:check |PASS. |
| npm run build |PASS;475,84kB iniciales, sin avisos de presupuesto. |

`fuentes-sha256.csv` identifica25 fuentes del relevo frontend.
`artefactos-sha256.json` identifica los tres archivos del directorio browser.
No incluyen autorreferencias, logs ni este informe en las huellas de fuentes.
Bundle: main-ZZ2SXBBI.js. No Docker ni Git ejecutados por este implementador.

## Corrección independiente del arnés

`arnes-http-01` completó la semilla y falló porque la sonda de sobrecupo exigía
CSRF200. El contrato original devuelve204 y no se modificó. `recorrido.mjs`
ahora exige204 exactamente. `../carga-sobrecupo-estatico-02.json` conserva siete
comprobaciones offline, incluida la negativa200; la evidencia01 errónea y la
ejecución HTTP fallida se preservan. La próxima prueba HTTP del coordinador
deberá comprobar el recorrido corregido; estos dobles no acreditan carga real.

## Pendiente

E2E demo y regresión afectada usando esta imagen, revisión independiente y
consolidación por el coordinador. Las cuatro ventanas oficiales de65min y la
recomendación de recursos no quedan acreditadas por este informe.

## Evidencia posterior al congelado

El coordinador ejecutó `../e2e-demo-final-02`:1/1PASS sin reintentos,2,7s de
duración del caso. La salida del runner indica1,3min en total; este tiempo no
es una medición de arranque del servidor. El recorrido de navegador validó la
corrección con la nueva imagen. La regresión original y la consolidación global
siguen a cargo del coordinador; no se extrapola este caso a una aceptación.

El modo de prueba del arnésHTTP02 conservó otro FAIL independiente: lanzó sus
tres recorridos sin los desfases declarados. La evidencia registra67peticiones
en548,355ms e iniciosA/B/C13,217/13,448/13,512ms desde su origen, con cuatro429
inesperados. No es el patrón0/1000/2000ms de la ejecución oficial.
Ahora ambos modos comparten la misma constante de desfases y la prueba registra
inicio previsto/observado. No cambian cuotas, mezcla, ventanas ni umbrales y
no hay reintentos. `../carga-planificador-estatico-01.json` conserva el análisis
del fallo y cuatro comprobaciones offline del nuevo diagnóstico sanitizado de
rechazos. La siguiente ejecución HTTP del coordinador sigue siendo necesaria.
