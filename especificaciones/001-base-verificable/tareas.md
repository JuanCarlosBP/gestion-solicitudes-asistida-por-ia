# 001 — Base verificable: tareas

**Estado:** Aprobado

Todas las tareas están aprobadas. El estado real de AG-006 se registra al final
y en la validación; la aprobación no equivale a aceptación de la entrega.
La persona responsable aprobó el paquete y DT-01 a DT-08 el 2026-10-13.
El trabajo de 001 requiere lanzamiento humano y superar el preflight bloqueante;
esta consolidación documental no comienza T001.
Se basan en la [especificación](especificacion.md) y el [plan](plan.md).
El coordinador asignará un único escritor por archivo antes de delegar.
El planificador y el revisor no modificarán archivos.

## Orden y dependencias

T001 precede a toda generación de código.
T002 y T004 pueden ejecutarse en paralelo con el contrato DT-04 aprobado.
T003 depende de T002; T005 depende de T003 y T004.
T006 puede prepararse con esos resultados y cerrarse después de T005.
T007 depende de todas las anteriores; T008 revisa la entrega consolidada.
Un bloqueo en una dependencia impide dar su tarea dependiente por verificada.

## T001 — Confirmar entorno y fijar versiones

**Requisitos:** BV-01 y decisiones DT-01 a DT-08.
**Responsable:** coordinador con análisis del planificador.

Comprobar aprobaciones, permisos, herramientas locales, red y motor Docker.
Resolver versiones exactas dentro de las líneas y límites del plan.
Consultar fuentes oficiales y registrar fecha, fuente, motivo, mantenimiento e integridad.
Fijar directas estables y exactas, sin `latest`; transitivas según ADR-0002 aprobado.
Ante incompatibilidad o vulnerabilidad relevante sin solución, detenerse antes de código.
Escribir únicamente documentación de versiones y decisiones antes de generar código.

**Archivos previstos:** `docs/documentaciondev/versiones.md`,
`docs/documentaciondev/arquitectura.md` y las aclaraciones autorizadas del paquete 001.
**Evidencia:** versiones observadas, fuentes, comprobaciones de compatibilidad
y lista de recursos disponibles o bloqueados.
**Aceptación:** todas las versiones necesarias fijadas y entorno suficiente.
Si requiere instalar herramientas globales o cambiar una línea, detenerse.

## T002 — Backend y contrato técnico

**Requisitos:** BV-01, BV-02, BV-04, BV-05 y parte de BV-08.
**Responsable:** implementador backend.

Crear Spring Boot con Java 21, Maven Wrapper y dependencias fijadas.
Implementar el contrato de salud y su tratamiento seguro de errores.
Preparar OpenAPI, Swagger UI y permisos técnicos mínimos.
Añadir pruebas unitarias y HTTP para respuestas 200/503 sin información interna.

**Archivos previstos:** `backend/` y su configuración de construcción.
**Evidencia:** build mediante Wrapper, informes unitarios, contrato y respuestas HTTP.
**Aceptación:** backend construible, contrato coherente y pruebas técnicas superadas.
No crear autenticación funcional, entidades de negocio ni CRUD.

## T003 — PostgreSQL y migraciones reales

**Requisitos:** BV-03, BV-04 y BV-08.
**Responsable:** el mismo escritor backend, después de T002.

Añadir PostgreSQL, Flyway, esquema técnico y configuración por entorno.
Separar permisos de migración y ejecución donde sean necesarios.
Crear integración con Testcontainers y PostgreSQL real aislado.
Comprobar migración inicial, segundo arranque, fallo aislado y caída de dependencia.

**Archivos previstos:** `backend/`, incluidas migraciones y pruebas de integración.
**Evidencia:** informes con PostgreSQL utilizado y resultados 200/503 del servicio real.
**Aceptación:** migraciones repetibles, fallo seguro y ningún dato de negocio creado.
No sustituir esta evidencia por pruebas con una base en memoria.

## T004 — Pantalla Angular y navegación

**Requisitos:** BV-01, BV-06 y parte de BV-08.
**Responsable:** implementador frontend.

Crear Angular con TypeScript, HTML, CSS y versiones fijadas.
Añadir ruta inicial, redirección raíz y salida controlada para ruta desconocida.
Consumir el contrato técnico y mostrar carga, disponibilidad y error.
Añadir pruebas de componente, servicio HTTP y navegación pertinentes.

**Archivos previstos:** `frontend/`, incluido el lockfile.
**Evidencia:** build, pruebas frontend, tipos, formato/lint y comportamiento de error.
**Aceptación:** pantalla comprensible y pruebas que cubren los estados observables.
La integración con el backend real se completa en T005.

## T005 — Entorno Docker Compose

**Requisitos:** BV-04 a BV-07 y BV-10.
**Responsable:** implementador de entorno; toma la escritura tras las tareas anteriores.

Crear contenedores backend/frontend y Compose con PostgreSQL interno.
Fijar imágenes y comprobar permisos y puertos mínimos.
Probar arranque, ruta directa, recarga, OpenAPI, Swagger y comunicación real.
Comprobar persistencia tras parada y arranque normales, sin borrar datos.

**Archivos previstos:** Dockerfiles en backend/frontend,
`infraestructura/compose.yaml` y configuración de ejemplo necesaria.
**Evidencia:** comandos observados, estado de servicios y comprobaciones HTTP/navegador.
**Aceptación:** conjunto local utilizable y parada documentada sin pérdida de datos.
No publicar servicios ni modificar recursos Docker ajenos al proyecto.

## T006 — QA y CI inicial

**Requisitos:** BV-08 y BV-09.
**Responsable:** implementador QA, con archivos reservados por el coordinador.

Configurar análisis de tipos, formato/lint, análisis estático y dependencias.
Crear workflow GitHub Actions de backend/frontend e integración PostgreSQL.
Fijar versiones, permisos y conservación de informes sin secretos.
Validar configuración y ejecutar localmente los comandos equivalentes disponibles.

**Archivos previstos:** `.github/workflows/ci.yml`, `qa/` y configuraciones
de herramientas en backend/frontend solo cuando su escritor anterior haya terminado.
**Evidencia:** informes de análisis y pruebas; validación del workflow.
**Aceptación local:** comandos obligatorios superados y fallos visibles.
**Pendiente remoto obligatorio:** ejecución de CI tras el push de la persona responsable.
No declarar CI remota superada ni ejecutar Git para provocarla.

## T007 — Documentación y validación consolidada

**Requisitos:** BV-01 a BV-10.
**Responsable:** coordinador como único escritor documental.

Crear instrucciones reales de entorno, construcción, pruebas, depuración y parada.
Repetir los pasos posibles desde un entorno limpio o describir la limitación.
Crear `validacion.md` con los resultados realmente ejecutados.
Actualizar README, índice y MEMORY con el estado exacto.

**Archivos previstos:** `docs/documentaciondev/entorno.md`, arquitectura y versiones,
`especificaciones/001-base-verificable/validacion.md`,
README, índice, MEMORY y registro de ejecuciones.
**Evidencia:** matriz BV → tarea → comprobación → resultado → archivo/registro.
**Aceptación:** todos los criterios relacionados, sin pruebas inventadas ni secretos.
La falta de CI remota u otra evidencia obligatoria mantiene pendiente su aceptación.

## T008 — Revisión y entrega

**Requisitos:** BV-01 a BV-10.
**Responsable:** revisor de solo lectura y coordinador para consolidar.

Se prioriza una revisión independiente. Si se utiliza el
[fallback secuencial](../../docs/metodologia/orquestacion.md#16-fallback-agéntico),
la misma sesión revisa en una etapa separada y declara que no fue independiente.
Se registra el nivel utilizado sin reducir criterios ni pruebas.

Revisar requisitos completos, diferencias y correspondencia de evidencias.
Comprobar alcance, errores, seguridad, reproducibilidad y documentos.
Entregar hallazgos; las correcciones vuelven a quien implementó.
El coordinador repite la verificación afectada tras cada corrección.

**Archivos:** el revisor no escribe; el coordinador consolida la validación autorizada.
**Evidencia:** criterios cubiertos, hallazgos, correcciones y pendientes.
**Aceptación:** ausencia de bloqueantes locales y pendientes remotos declarados.
La persona responsable decide la aceptación final.
Tras dos correcciones fallidas del mismo problema, detenerse y entregar el bloqueo.

## Entrega común

No ejecutar Git ni desplegar.
Entregar manifiesto de archivos y sugerencias de commits semánticos.
Las especificaciones futuras del prompt nocturno son borradores separados;
no forman parte de la implementación funcional de 001.

## Estado de ejecución AG-006

| Tarea | Estado real |
|---|---|
| T001 | Controles de versiones, lockfile, instalación, auditorías y Docker ejecutados; directas exactas. |
| T002 | Backend y contrato implementados; unitarias/HTTP, compilación y empaquetado comprobados. El verify integral depende del formato T006. |
| T003 | Migraciones, roles y 3 integraciones PostgreSQL real superadas. |
| T004 | Pantalla, rutas, 11 pruebas, tipos, lint, formato y build superados. |
| T005 | Imágenes y Compose comprobados; persistencia, 200/503 real, recuperación y navegador superados. |
| T006 | Parcial: SpotBugs, auditorías y workflow/actionlint superados. Formato Maven bloqueado tras dos correcciones; verify obligatorio falla. CI remota pendiente. |
| T007 | Documentación y evidencias consolidadas con las limitaciones de T006; revisión humana pendiente. |
| T008 | Revisión secuencial de la misma sesión; aceptación bloqueada por control local pendiente y CI remota. |

Las aprobaciones originales se conservan. No se declara el incremento aceptado
ni totalmente verificado; no se han ejecutado operaciones Git.
