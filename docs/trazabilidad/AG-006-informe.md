# AG-006 — Base local operativa; aceptación pendiente

Ejecución del 2026-10-13, Europe/Madrid. Inicio **10:16:08 +02:00**;
cierre y duración exactos en el [registro de cierre](../../qa/evidencias/ag006/cierre.json).
Ventana autorizada: diez horas, hasta **20:16:08 +02:00**.
Workspace: `C:\Users\carli\gestion-solicitudes-asistida-por-ia`.
Rama declarada por la persona responsable: `feature/001-base-verificable`;
no consultada. **No se ejecutó ninguna operación Git**, tampoco de lectura.

La API, PostgreSQL, Angular y Compose funcionan en local con datos ficticios.
**001 no está completamente verificado ni aceptado:** el control obligatorio
Spotless falla y la CI remota no se ha ejecutado. El bloqueo de formato se aisló;
se completó el trabajo independiente y se conservaron los fallos como evidencia.

## Tareas y tiempos

Las horas intermedias identifican hitos observados, no duración exclusiva de CPU
ni trabajo independiente en paralelo. El [registro de hitos](../../qa/evidencias/ag006/hitos.jsonl)
conserva la progresión y el cierre añade los tiempos acumulados desde el inicio.

| Tarea | Resultado y límite |
|---|---|
| T001 | Versiones, política, inventario, instalación y herramientas comprobados; hito 10:23:17. Compatibilidad completada con las pruebas posteriores. |
| T002 | Backend, contrato, seguridad técnica, 10 unitarias/HTTP y empaquetado comprobados. Verify integral bloqueado por T006. |
| T003 | 3 integraciones con PostgreSQL real: primer/segundo arranque, permisos, migración inválida y caída. PASS. |
| T004 | Angular, navegación, 11 pruebas, tipos, lint, formato y build. PASS. |
| T005 | Builds Docker, Compose, persistencia, 503 real, recuperación, navegador y Swagger. PASS local. |
| T006 | QA y CI creados; auditorías y SpotBugs PASS. Formato Java bloqueado tras dos correcciones fallidas; CI remota pendiente. |
| T007 | Documentación y matriz consolidadas, límites declarados. Aceptación dependiente de T006 y revisión humana. |
| T008 | Revisión secuencial no independiente realizada; hallazgo de temporales corregido y comprobado. Aceptación bloqueada por formato. |

## Versiones exactas y procedencia

La historia y fuentes permanecen en [versiones](../documentaciondev/versiones.md).
Las imágenes están fijadas por digest en Dockerfiles/Compose; sus consultas oficiales
se conservan en los archivos imagenes-*.json de evidencias.

| Componente | Versión usada |
|---|---|
| Java / Spring Boot | Temurin 21.0.12.1 / 4.0.8 |
| Maven / Wrapper | 3.9.16 / 3.3.4, distribución ZIP con SHA-256 y SHA-512 oficial comprobado |
| springdoc / OpenAPI | 3.0.3 / contrato 3.1 |
| Flyway / PostgreSQL JDBC / PostgreSQL | 11.14.1 / 42.7.13 / 17.11-bookworm |
| Testcontainers / JUnit / Surefire y Failsafe | 2.0.5 / 6.0.3 / 3.5.6 |
| Tomcat / Jackson BOM 2 y 3 | 11.0.25 / 2.21.7 / 3.1.7 |
| Spotless / google-java-format / SpotBugs Maven | 3.10.4 / 1.37.0 / 4.10.5.0 |
| Node / npm | 24.13.0 / 11.6.2, sin actualización global |
| Angular framework/compiler-cli / CLI/build | 21.2.25 / 21.2.26 |
| TypeScript / RxJS / tslib | 5.9.3 / 7.8.2 / 2.8.1 |
| Vitest / jsdom / Playwright | 4.1.11 / 27.4.0 / 1.64.0 |
| ESLint y @eslint/js / angular-eslint / typescript-eslint | 9.39.5 / 21.4.0 / 8.71.2 |
| Prettier / @types/node | 3.9.10 / 24.19.2 |
| Nginx / Docker Engine / Compose | 1.28.3-trixie / 29.1.3 / 2.40.3 |
| OSV-Scanner / actionlint | 2.7.0 / 1.7.12, binarios con suma oficial verificada |

## Política e inventario de preliminares

[ADR-0002](../decisiones/ADR-0002-politica-dependencias-transitivas.md) aplica la
política humana general. ADR-0001 e historia AG-003/004/005 se preservan.
Se hizo **un inventario completo de 689 entradas** del lockfile: **16 preliminares**,
todas `TRANSITIVA_CONTROLADA`; ninguna directa preliminar, ninguna `NO_ACEPTABLE`.
El [inventario por paquete](../../qa/evidencias/ag006/dependencias-preliminares.json)
incluye las 16 rutas, versiones, cadenas, licencias, origen e integridad.

- Rolldown 1.0.0-rc.4: introducido por @angular/build 21.2.26.
- @rolldown/pluginutils y 13 bindings de plataforma: 1.0.0-rc.4, misma familia.
- gensync 1.0.0-beta.2: introducido por @babel/core 7.29.7 desde build/compiler-cli.

Motivos: herramientas estables mantenidas como introductoras, registro oficial,
integridades presentes, lockfile coherente, ausencia de dependencia/importación
directa y de overrides/resolutions. npm ci verificó los paquetes descargados;
explain/ls, auditorías, build y pruebas completaron los controles externos.
Las 13 variantes del lockfile no significan 13 binarios ejecutados en Windows.
No se pretende estabilidad upstream del paquete preliminar por esta clasificación.

## Resultados y evidencia ejecutada

| Comprobación | Resultado observado | Evidencia principal |
|---|---|---|
| npm ci, explain Rolldown/Gensync, ls | PASS; 584 paquetes instalados; sin conflicto de árbol | npm-ci-corregido.txt, npm-explain-*.txt, npm-ls.json |
| Auditorías npm producción y completa | PASS, 0 vulnerabilidades informadas | npm-audit-produccion-final.json, npm-audit-completo-final.json |
| Auditoría Maven inicial | 125 componentes, 17 coincidencias: 3 críticas, 10 altas, 4 moderadas | maven-osv-inicial.json, maven-osv-resumen.json |
| Parches y auditoría Maven final | Tomcat/Jackson corregidos; 125 componentes, 0 coincidencias, salida 0 | maven.cdx.json, maven-osv.json, maven-osv-preparador-final.txt |
| Backend independiente del formato | 10 unitarias/HTTP + 3 IT, empaquetado y SpotBugs PASS | backend-regresion-seguridad.txt, informes-backend/ |
| Verify obligatorio | FAIL en Spotless/InvocationTargetException | backend-verify-final-obligatorio.txt |
| Frontend | 11 pruebas PASS; tipos, lint, formato y build PASS | frontend-*-final.txt, frontend-tipos-e2e.txt, frontend-lint-e2e.txt, informes-frontend/ |
| Chromium | 5 E2E PASS: rutas/recarga, carga/error, teclado/móvil, Swagger y cabeceras/denegación | e2e-final.txt, informes-frontend/e2e.xml |
| Compose real | Build/arranque, historial idéntico, caída PostgreSQL 503 y recuperación 200 PASS | compose-parches-seguridad.txt, compose-persistencia-caida.json, compose-qa-revision.txt |
| Ausencia de configuración | Contenedor sin DB_URL ni red termina con salida 1 y error identificable | configuracion-ausente.json |
| Workflow | actionlint PASS; no ejecución remota | actionlint-final.txt, workflow versionado |
| Documentación, secretos y archivos | Resultados de los verificadores al cierre | documentacion-control.json, entrega-integridad.json, entrega-manifiesto.json |

Todas estas rutas de evidencia pertenecen a [qa/evidencias/ag006](../../qa/evidencias/ag006/).
Los informes JUnit no contienen pruebas omitidas en los conjuntos finales.
No se midió porcentaje de cobertura ni se inventó un umbral.
El verify independiente usa explícitamente `-Dspotless.skip=true`; **no acredita
el conjunto obligatorio**, cuyo fallo sigue presente en POM, documentación y CI.
Dos exclusiones SpotBugs están acotadas a método/patrón y justificadas en XML.

La auditoría Maven se ejecutó offline contra el volcado público descargado;
no se envió el inventario a OSV. La revisión automática había rechazado la
alternativa API por esa transmisión. Los avisos iniciales se evaluaron según
configuración: no hay autenticadores Tomcat DIGEST/FORM ni entradas JSON de negocio;
los parches compatibles se aplicaron igualmente antes de la regresión final.

## Revisión T008 y seguridad

Fallback nivel 3: una misma sesión, roles secuenciales y un único escritor.
Revisión de solo lectura separada de implementación; **no independiente** y sin
aprobar por la persona responsable. Requisitos comparados con evidencia real.

| Hallazgo | Impacto / criterio | Estado |
|---|---|---|
| R006-01: formatter falla con Java 21 | Bloqueante local de verificación BV-08/09, sin evidencia de vulnerabilidad funcional. Reproducible con mvnw verify. | Pendiente; dos correcciones agotadas. |
| R006-02: directorio temporal no creado en QA Compose | Reproducibilidad BV-01/09 en entorno limpio; podría impedir Chromium antes de probar. | Devuelto al implementador, corregido; repetición real PASS y revisión posterior. Runner remoto sigue pendiente. |

Controles revisados: AM-04, consulta constante preparada y sin entrada de usuario;
AM-05, texto interpolado/contrato cerrado y CSP; AM-07, mismo origen sin CORS abierto;
AM-14/15/18, respuestas 200/503/403 mínimas, sin Actuator, variables de entorno y
puerto 127.0.0.1, búsqueda acotada de secretos y cache-control no-store;
AM-16/20, dependencias/digests/Wrapper fijados, integridades y auditoría;
AM-19/23, pool pequeño, tiempos acotados y recuperación real; AM-21/22,
rollback de migración inválida, arranque fallido y permisos mínimos PostgreSQL.
Evidencias: pruebas HTTP, integración, E2E y Compose indicadas arriba.
No se declara mitigación completa ni cumplimiento OWASP/ASVS por estos controles.
Identidad, permisos de negocio, importes, aprobaciones e historial están fuera de 001.

## Archivos y conservación histórica

El [manifiesto completo](../../qa/evidencias/ag006/entrega-manifiesto.json) enumera
cada archivo creado/modificado/sin cambios con tamaño, SHA-256 y tipo.
No es un estado Git. Excluye cachés, builds, .env local y sus propias dos salidas.
El [control de integridad](../../qa/evidencias/ag006/entrega-integridad.json)
compara los prefijos históricos del CSV, versiones, ADR-0001 y validación con el
inventario inicial. La [memoria histórica](memoria-hasta-ag005.md) conserva íntegros
los bytes del MEMORY anterior. El lockfile de AG-005 no se modificó.
Se exige exactamente una fila AG-006; las anteriores no se reescriben.

Áreas creadas: backend (código, pruebas, Wrapper, Docker), frontend (aplicación,
pruebas, configuración y Docker), infraestructura (Compose y roles), qa
(verificadores y evidencias), CI, ADR-0002, entorno, arquitectura e informe.
Áreas modificadas: manifiesto frontend, estado documental de 001, README/índices,
MEMORY, adiciones históricas y la fila AG-006. Políticas, .agents y .codex se conservan.

Incidencia de límite de escritura: la primera asignación de caché npm falló y
npm utilizó su caché predeterminada. Se corrigió la ruta al workspace y se repitió
npm ci. No se borró esa caché externa ni se actualizaron herramientas globales.
El detalle y los demás fallos reales están en [incidencias](../../qa/evidencias/ag006/incidencias.md).

## Operación, pendientes y riesgos restantes

Seguir [entorno](../documentaciondev/entorno.md) para arrancar desde configuración
ficticia. Solo se publica 127.0.0.1:18080; PostgreSQL/backend no publican puertos.
Todos los procesos de aplicación ejecutan sin root. Al cierre se detienen los
tres servicios conservando el volumen; [evidencia](../../qa/evidencias/ag006/compose-cierre.json).
No se despliega, no se eliminan volúmenes ni se alteran servicios ajenos.

Pendiente local: decisión humana sobre otra ronda de reparación del formatter,
seguida del verify obligatorio sin omisiones y revisión de los resultados.
Pendiente remoto: push humano, CI Ubuntu y enlace de ejecución revisado.
La compilación Linux en Docker no sustituye los tests del runner remoto.
El desarrollo nativo npm start está configurado pero no probado de extremo a extremo.
No se probó otra máquina Windows; la reproducción local reutilizó las herramientas
instaladas y cachés, aunque Testcontainers creó bases nuevas y Docker etapas de build.

Riesgos/límites: revisión no independiente; aviso de fin de soporte ESLint 9;
versiones Node/npm locales conservadas; sin auditoría de paquetes del SO de imágenes
ni plugins Maven; base OSV de la fecha, sin garantía sobre vulnerabilidades desconocidas.
La búsqueda de secretos es acotada y no una certificación. No hay exposición pública.
No se crean borradores 002–008: la entrega se concentra en 001 y su bloqueo pendiente.

## Manifiesto de commits sugeridos

Solo propuestas para la persona responsable; no ejecutar ni integrar mientras
la aceptación siga pendiente. Excluir .env, tmp, target, node_modules y builds.

| Grupo de archivos | Mensaje semántico sugerido |
|---|---|
| ADR-0002, adición ADR-0001, plan y versiones | `docs: aprobar política de dependencias transitivas de 001` |
| backend/ | `feat: crear API técnica con PostgreSQL y contrato OpenAPI` |
| frontend/ | `feat: añadir pantalla de disponibilidad y navegación Angular` |
| infraestructura/ y Dockerfiles | `build: preparar entorno Compose local con permisos mínimos` |
| qa/, E2E y .github/workflows/ | `test: verificar la base local y preparar CI con bloqueo de formato visible` |
| README, índices, arquitectura, entorno, validación, MEMORY y trazabilidad | `docs: registrar evidencia y pendientes de AG-006` |

Los Dockerfiles y las pruebas se asignarán a un único grupo al preparar los commits,
evitando dividir un mismo archivo entre grupos por esta tabla orientativa.
La persona responsable revisa los cambios, decide la corrección pendiente y acepta.
