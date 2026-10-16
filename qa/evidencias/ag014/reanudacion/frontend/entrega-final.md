# Entrega frontend AG-014

Resultado final: 33 recorridos E2E superados, sin omisiones ni reintentos, en 55,4s; 12 capturas finales inspeccionadas y 42 muestras de contraste superadas. Evidencia final: `e2e-05/`. La aplicación se liberó al coordinador después de finalizar las peticiones, para su comprobación independiente de salud/persistencia. Esta entrega no acepta el incremento por la persona responsable.

## Cambios y archivos

Se implementó el módulo `frontend/src/app/historial/` con modelos, validación de filtros, cliente HTTP, permisos, páginas y timeline reutilizable. Tiene historial integrado y directo de solicitud/proveedor, historial global, filtros y página en URL, recuperación de error, estados vacíos y aviso de historia anterior. Se añadieron rutas/navegación y el resumen real del inicio conservando salud. La lista completa de 33 archivos y sus SHA256 está en `fuentes-corregidas-06.json`; `integridad-final.json` comprueba que siguen idénticos.

Las comprobaciones detectaron y corrigieron etiquetas accesibles, selección inicial de20eventos, restablecimiento de campos editados sin aplicar, carga CSS incompatible con CSP y contraste durante habilitación de botones. La validación cliente compara nanosegundos de fechas y respeta el límite de desplazamiento100000. Los contratos y permisos siguen siendo autoridad del backend.

En E2E se actualizaron expectativas cerradas de Swagger a21rutas, se acotaron mensajes de éxito para distinguirlos del nuevo status del timeline y se esperó la restauración efectiva de filtros antes de editarlos. El replay manual utiliza un contexto HTTP aislado con la misma sesión, Bearer, clave y cuerpo, sin relogin; conserva igualdad exacta de respuesta y exige201. No cambia el control CSRF del producto. El403 inicial es compatible con la carrera del cookie jar, pero su causa concreta no se dio por demostrada solo por los logs.

## Comprobaciones ejecutadas

| Comprobación | Esperado | Observado y evidencia |
| --- | --- | --- |
| Angular | Todos los casos pasan | 479 pruebas en23archivos PASS, `correccion-02-test.log`. La lógica Angular no cambió después; cambios posteriores fueron configuración de compilación, CSS y evidencia E2E. |
| Tipos, lint, formato y build | Salida0, sin errores | PASS, últimos logs `contraste-correccion-02-*.log`. |
| npm audit producción y completo | Consulta al registro oficial autorizado | Salida0 y0vulnerabilidades en ambas auditorías; `npm-audit-produccion.json`, `npm-audit-completa.json` y metadatos de ejecución. Sin cambio de dependencias. |
| E2E integrado | 33 recorridos, retries0 | 33PASS en55,4s, `e2e-05/ejecucion.log`, `.json` y `resultados/e2e.xml`. |
| Historia previa real | Decisión V5 y aviso sin backfill | HA-E2E07 PASS con recurso `062d8783-3415-4243-b9da-86145eb29668`, flag `decisionV5Real=true`. |
| Replay | Mismos datos y respuesta201 | `e2e-05/resultados/operaciones-CI-01-04-06-07-1b079-y-recuperación-de-baja-alta/replay-csrf.json`: presencia/igualdad CSRF true, contexto aislado true, status201. Sin guardar cookies/tokens. |
| UI y accesibilidad acotada | 360/768/1440, teclado y contraste>=4,5 | 12 capturas inspeccionadas,42muestras PASS, mínimo5,52686:1; foco3px solid. Detalle en `revision-visual-final.md`. |

## Trazabilidad de intentos

Todos los intentos y sus fuentes se conservan; no se ejecutaron retries automáticos.

| Intento | Resultado observado | Motivo del siguiente pase |
| --- | --- | --- |
| E2E01 | 25PASS/8fallos | Etiquetas, expectativas/selectores y sincronización del harness; clasificación en `correccion-01-clasificacion.md`. |
| Diagnóstico Restablecer | 23PASS/1fallo enfocado | Defecto confirmado, primera corrección pasó24casos y regresión479. |
| E2E02 | 32PASS/1fallo | CSP bloqueaba onload de CSS; primera corrección `inlineCritical=false`, sin relajar CSP. |
| E2E03 | 32PASS/1fallo | Contraste transitorio de botones del historial; primera corrección local. |
| E2E04 | 33PASS | La revisión visual encontró el mismo contraste transitorio en el inicio; segunda corrección del fenómeno en estilo compartido y ampliación de muestras. |
| E2E05 | 33PASS | Pase final con42muestras y12capturas revisadas; sin nuevo hallazgo. |

El contraste quedó resuelto en la segunda corrección del fenómeno. No se excedió el límite de dos correcciones fallidas para un mismo problema. No se modificaron backend, documentación principal, QA compartido ni CI desde este rol; tampoco se ejecutó Git ni se levantaron/recrearon/eliminaron contenedores por este implementador.

## Pendientes y relevo

No quedan correcciones frontend pendientes dentro del alcance comprobado. El coordinador integra las evidencias con sus pruebas de API, migración y salud/persistencia, y actualiza MEMORY/documentación porque son archivos de su propiedad. La revisión independiente final y la decisión de aceptación/integración/despliegue corresponden a sus responsables; no se afirman como realizadas por este rol.
