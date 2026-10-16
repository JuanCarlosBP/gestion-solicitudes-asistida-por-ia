# AG-011 — Catálogo de proveedores

**Estado:** 003 verificada localmente en AG-011.
No aceptada ni integrada. Autorización humana integral AG-011 y D-003-01 a D-003-08.

## 1. Tiempo y autorización

Inicio **2026-10-14 01:29:00 +02:00**, Europe/Madrid.
Límite máximo **2026-10-14 11:29:00 +02:00**.
Cierre **2026-10-14 02:21:52+02:00**. Duración total **00:52:52** (3172 segundos),
incluida la interrupción y reanudación. [Metadatos de cierre](../../qa/evidencias/ag011/cierre.json).
La interrupción temporal y la reanudación «continua» no reiniciaron el límite.
Rama comunicada por la persona responsable: feature/003-proveedores, sin comprobar con Git.
**Ninguna operación Git ejecutada en AG-011.** No commit, push, status, diff,
checkout, integración de PR ni despliegue público.

La precondición terminó en menos de 15 minutos: Java21.0.12.1, Node24.13.0,
npm11.6.2 y Docker29.1.3 accesibles, compilación backend/build frontend con código0,
documentos de entrada y huellas iniciales. No se repitió AG-010 completa antes de programar.

## 2. Alcance, SDD y ADR

Se concilió el borrador con todas las decisiones humanas antes de implementar.
[Especificación003](../../especificaciones/003-proveedores/especificacion.md),
[plan](../../especificaciones/003-proveedores/plan.md) y
[tareas](../../especificaciones/003-proveedores/tareas.md) aprobados por AG-011.
[Validación](../../especificaciones/003-proveedores/validacion.md) contiene el mapa
de resultados y [ADR-0004](../decisiones/ADR-0004-catalogo-proveedores-y-concurrencia.md)
explica decisiones, alternativas y límites.

Proveedor es catálogo, nunca cuenta de acceso. Incluye alta, consulta, búsqueda,
edición, baja lógica/reactivación y versión. Excluye solicitudes, conceptos,
importes, aprobaciones, historial funcional, pagos, bancos, multiempresa e integraciones.
Solo usuarios y datos ficticios.

## 3. Estado PR-01 a PR-12

| ID | Resultado local |
|---|---|
| PR-01 | PASS: alta201/Location, UUID/fechas servidor, activo/version0 y entrada inválida rechazada. |
| PR-02 | PASS: DTO público; inexistente/no visible404. |
| PR-03 | PASS: búsqueda/filtros AND, orden estable, límites y paginación. |
| PR-04 | PASS: edición permitida, versión incrementada, campos internos preservados. |
| PR-05 | PASS: baja lógica sin borrado; repetición vigente sin cambios. |
| PR-06 | PASS: reactivación administrador; repetición vigente sin cambios. |
| PR-07 | PASS: normalización/unique incluye inactivos y altas concurrentes. |
| PR-08 | PASS: matriz y unión de roles, CSRF y denegación por defecto en backend. |
| PR-09 | PASS: conflicto409 sin sobreescritura; carreras reales. |
| PR-10 | PASS: Angular/rutas/estados, doce pasos E2E, teclado/foco/móvil básicos. |
| PR-11 | PASS: errores/entrada/SQL/eventos y privacidad dentro del alcance probado. |
| PR-12 | PASS: pruebas, CI local, auditorías, documentación y revisión independiente. |

Las evidencias por requisito constan en validación. PASS local no significa
aceptación humana, integración ni ejecución de CI remota.

## 4. Migración y arquitectura backend

[V3__proveedores.sql](../../backend/src/main/resources/db/migration/V3__proveedores.sql)
crea gestion.proveedores: UUID, tipo, denominación, país/fiscal original y normalizado,
contacto opcional, activo, versión y tiempos. Unique compuesto y restricciones,
índices de estado/denominación/país/orden. gestion_app recibe SELECT/INSERT/UPDATE;
no DELETE ni DDL. V1/V2 intactas. País usa varchar(2) y CHECK exacto de dos
mayúsculas, equivalente al mínimo propuesto sin padding de char(2); ISO en dominio.

Módulo proveedores separado en dominio, aplicación, persistencia JdbcTemplate y
HTTP. Transacciones, Clock inyectable truncado a microsegundos, DTO cerrados,
consultas parametrizadas y permisos en HTTP/servicio. Sin nuevas dependencias,
JPA, servicios externos ni abstracciones genéricas.

## 5. Endpoints y errores

| Método/ruta | Resultado normal |
|---|---|
| POST /api/proveedores | 201, Location y proveedor público. |
| GET /api/proveedores/{id} | 200 público o404 si inexistente/no visible. |
| GET /api/proveedores | 200 con elementos/pagina/tamano/totalElementos/totalPaginas. |
| PUT /api/proveedores/{id} | 200, versión incrementada. |
| POST /api/proveedores/{id}/desactivar | 200, baja o repetición vigente sin cambios. |
| POST /api/proveedores/{id}/reactivar | 200, reactivación o repetición vigente sin cambios. |

Bearer en todas; XSRF en POST/PUT. Errores estables sin detalles internos:
400 SOLICITUD_INVALIDA, 401 NO_AUTENTICADO, 403 ACCESO_NO_PERMITIDO,
404 PROVEEDOR_NO_ENCONTRADO, 409 PROVEEDOR_DUPLICADO/VERSION_OBSOLETA,
500 ERROR_INTERNO y503 DEPENDENCIA_NO_DISPONIBLE.
OpenAPI runtime comprobado con required Alta4/Edicion5/Estado1,
additionalProperties=false y Swagger accesible en el perfil local.

## 6. Permisos y privacidad

| Rol | Lee activos | Lee inactivos | Escribe |
|---|---|---|---|
| SOLICITANTE | Sí | No | No |
| SUPERVISOR | Sí | No | No |
| AUDITOR | Sí | Sí | No |
| ADMINISTRADOR | Sí | Sí | Sí |

La unión de roles suma permisos explícitos; nadie elude validaciones ni versión.
La interfaz oculta acciones según rol, pero el backend decide.
Sin nuevos tokens ni contactos en almacenamiento web. Respuestas privadas no-store.
Eventos técnicos de crear/modificar/desactivar/reactivar/duplicado/conflicto
limitados a acción, usuario, proveedor y resultado. No hay requestId disponible.
Éxitos después del commit; sin fiscal, correo, teléfono ni cuerpos en logs comprobados.

## 7. Identidad fiscal, filtros y concurrencia

NFKC → recortar extremos → mayúsculas Locale.ROOT → colapsar espacios Unicode,
incluido U+0085, preservando puntuación. Longitud3–64 original/normalizada sin
truncar expansiones. Unicidad país/fiscal normalizado incluye inactivos.
Países distintos admiten mismo fiscal. Sin checksum o validez jurídica universal.

Offset page=0, size=20 y máximo100. Denominación contiene literal sin distinguir
mayúsculas; acentos significativos. Fiscal exacto normalizado. Tipo/país/estado,
combinados AND. activo=true por defecto; false/todos requieren auditor/admin.
Orden cerrado denominacion/creadoEn/actualizadoEn asc/desc, id asc desempata.
Volumen50.000 es previsión, no benchmark ni garantía de latencia.

Versión inicial0; SQL UPDATE exige id/version. Edición incrementa versión;
cambio de estado vigente repetido no cambia fecha/versión/eventos. Versión
obsoleta siempre409. Tres IT coordinan dos conexiones PostgreSQL bloqueadas
mediante pg_stat_activity; alta deja un éxito/un duplicado y edición/estado un
éxito/un conflicto. REST también comprueba pares simultáneos.
El E2E muestra conflicto entre dos contextos de navegador y permite recargar.

## 8. Comprobaciones ejecutadas

| Área | Resultado observado |
|---|---|
| Backend verify íntegro | 98 PASS:61 unitarias/HTTP +37 IT, 0fallos/errores/omitidas;43 nuevas y55 anteriores. |
| Spotless/SpotBugs | PASS; Max/Low sin hallazgos; exclusión precisa justificada de puerto Spring, sin rebajar umbral. |
| Angular | 130 PASS/13 suites;74 nuevas y56 anteriores. Types/lint/formato/build PASS. |
| E2E Chromium/Compose | 9 PASS:8 anteriores +1 recorrido de12 pasos003. |
| API Compose proveedores | 78 controles PASS, incluidas carreras, CSRF, permisos, no-op, filtros y privacidad. |
| Sesiones Compose definitivas | 88 controles PASS:login, renovación, reuse/logout, roles y persistencia. |
| Salud/persistencia definitivas | V1/V2/V3 conservadas, PostgreSQL parado503 y recuperación200; navegador incluido. |
| Docker sin caché | Backend y frontend PASS; bundle final main-UBBPHK6T.js servido y comprobado. |
| OpenAPI/Swagger | Esquemas requeridos y operaciones reales PASS. |
| npm audit producción/completo | Cero vulnerabilidades comunicadas. Primer DNS fallido conservado. |
| Maven OSV offline |132 componentes comparados, cero hallazgos; base pública del mismo día00:05, huella registrada. |
| Dependencias preliminares |16 transitivas controladas por ADR-0002; sin nuevas dependencias/lockfile. |
| Actionlint/sintaxis/guardas QA | PASS local; evidencia propia. |
| Documentos/secretos/huellas | Control final y manifiestos propios, con alcance acotado. |

Fuentes: [backend-resumen](../../qa/evidencias/ag011/backend-resumen.md),
[frontend-qa](../../qa/evidencias/ag011/frontend-qa.md) y
[carpeta de evidencias](../../qa/evidencias/ag011/).
Las capturas finales cubren detalle, conflicto, auditor, lista móvil y formulario móvil.
Inspección visual y teclado/foco básicos; no auditoría WCAG completa.

## 9. Fallos reales y correcciones

Se conservaron primeros fallos y diagnósticos. No se sustituyeron por salidas PASS.

- R00301/02/03/04: espacios Unicode, precisión temporal, required de OpenAPI y
  límites Unicode de búsqueda. Corregidos con pruebas específicas y regresión.
- CSRF real: Bearer borraba cookie y difería reposición; se materializa el token
  diferido conservando rotación y validación. Reproducción fallida y jar posterior PASS.
- SpotBugs: construcción privada JdbcTemplate elimina un aviso; exclusión exacta
  de falso positivo del puerto inyectado resuelve el restante en segunda corrección.
- Navegación/página: conservar filtros en alta/cancelar y recuperar página válida.
- E2E intento01: ruta de Chromium ausente, corregida usando instalación existente.
  Intento02:8 previas PASS y pasos1–9; fallo10 por carrera foco/carga.
  Fieldset disabled/aria-busy durante GET y guard de envío corrigen el producto:
  nueva unitaria y E2E intento03 completo PASS en primera corrección, sin waits artificiales.
- Compose arrancado aún sin HTTP listo: espera de salud explícita antes del login.
- Docker snapshot de caché faltante: construcción sin caché PASS sin limpieza global.
- Socket Docker, DNS npm y resolución/temporales Angular requerían permiso específico
  fuera del sandbox. Se concedió sin cambiar controles del producto. La interrupción
  temporal de ejecución se retomó tras «continua»; no se considera resultado de prueba.

No se superó el máximo de dos correcciones por problema. Detalles y logs en
los resúmenes de cada escritor y en validación.

## 10. CI, archivos y propuesta de commits

CI incluye003 manteniendo una ejecución por PR (push solo main), permissions
contents:read, Actions por SHA, Java/Node/Docker/Compose e imágenes fijadas.
Ejecuta backend/frontend/Compose, API identidad/proveedores, E2E, auditorías,
actionlint/documentación y artefactos exclusivos del run. CI remota pendiente del push humano.

Inventario íntegro, incluidas evidencias, en
[entrega-manifiesto.json](../../qa/evidencias/ag011/entrega-manifiesto.json):
creados/modificados/eliminados respecto a la captura inicial, sin afirmar un diff Git.
Backend18 nuevos/6 modificados; frontend14 nuevos/4 modificados; sin eliminaciones
de fuentes. Documentación, QA/CI y evidencias completan el inventario final.

[manifiesto-commits.json](../../qa/evidencias/ag011/manifiesto-commits.json)
asigna cada archivo a agrupaciones sugeridas, para revisión y ejecución humana:

1. docs: aprobar catálogo de proveedores y concurrencia optimista
2. feat: implementar catálogo de proveedores con permisos y versión
3. feat: añadir gestión accesible de proveedores en Angular
4. test: verificar proveedores en Compose y ampliar CI
5. docs: registrar validación y evidencias de AG-011

No se ejecutaron esos commits. Las cuatro salidas de manifiesto se excluyen de
su propio inventario para evitar autorreferencia y están identificadas en integridad.

## 11. Orquestación, integridad y revisión

Coordinador: README/MEMORY/índices/CSV/SDD/docs/QA/CI/infra/cierre.
Planificador solo lectura concilió contrato; implementador backend dueño de
backend/** y backend-*; implementador frontend dueño de frontend/** y frontend-*.
Revisor independiente lee sin reparar. Máximo tres subagentes simultáneos.
Roles invocables; no fue necesario fallback ni cambiar configuración global.

Permisos efectivos workspace-write, auto_review y red restringida. Solo lectura
se respetó por instrucción, sin afirmar sandbox read-only técnicamente acreditado.
420 archivos históricos/protegidos comparados por SHA-256 y prefijo CSV por bytes:
AG-003–AG-010, REV-001, ADR-0001–0003, SDD cerrado001/002, V1/V2 y configuración.
Alcance desde captura inicial, no prueba operaciones previas a AG-011.
106 fuentes de candidata final y18 específicas frontend coinciden tras E2E.

La [revisión independiente](../../qa/evidencias/ag011/revision-independiente.md)
concluye sin hallazgos accionables abiertos. Contrastó criterios, código, pruebas,
seguridad, documentos y huellas. Los metadatos de cierre se verifican después.
La revisión nunca sustituye aprobación humana.

## 12. Riesgos, pendientes y siguiente paso

No queda fallo funcional conocido tras las comprobaciones anteriores.
Pendientes humanos: revisar entrega, ejecutar Git/push, comprobar CI remota,
aceptar e integrar. No se integraron las PR001/002 y no hay despliegue público.
La sesión se detiene tras entregar.

Límites: volumen de 50.000 sin benchmark, accesibilidad básica sin WCAG completa,
sin validación fiscal jurídica universal; retención/eliminación legal e historial007
pendientes, concurrencia/idempotencia transversal futura006. Las auditorías tienen
fecha/alcance y no cubren CVE desconocidas, plugins Maven ni SO de imágenes.
La búsqueda acotada de secretos no certifica ausencia universal. OWASP no se
declara completo. El volumen conserva datos ficticios y queda detenido sin borrarlo.

## 13. Trabajo opcional004

Después de completar la verificación local 003 y su revisión independiente,
se comprobó un margen de **550,49 minutos**, superior al mínimo de 45. La condición
consta en [condicion-borrador004.json](../../qa/evidencias/ag011/condicion-borrador004.json).
Se creó únicamente la [especificación 004](../../especificaciones/004-solicitudes-conceptos-importes/especificacion.md),
con estado **Borrador pendiente de aprobación humana**. Plantea once decisiones
sobre cabecera, permisos, proveedor, conceptos, moneda/redondeo, estados y repetición.
No hay plan, tareas, validación, migración ni código 004. Su contenido no se
presenta como decisión aprobada ni modifica los requisitos 003.
Una revisión documental independiente posterior no encontró hallazgos accionables.

El control documental de cierre detectó un espacio introducido por edición de
legibilidad en el enlace a la condición004. Se corrigió la ruta en una sola
corrección; el primer resultado permanece en documentacion-cierre-intento01.*.


La última actualización de tiempos detectó conversión automática de fechas de
PowerShell y dejó una duración inválida. Se conservó el intento, se corrigió el
cálculo ISO en Node y se contrastaron inicio/cierre/duración en informe, CSV,
MEMORY y JSON. Corrección única; no cambió código ni resultados de pruebas.
