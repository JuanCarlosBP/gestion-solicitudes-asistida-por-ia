# Backend AG-011 — resultado local

Fecha de cierre de evidencia: 2026-10-14, Europe/Madrid. Propiedad exclusiva de
este escritor: `backend/**` y evidencias `backend-*` AG-011. No se ejecutó Git,
Compose, despliegue ni escritura de documentos históricos. MEMORY y documentación
durable corresponden al coordinador.

## Ejecutado y observado

- `mvnw.cmd verify -Dstyle.color=never`: **PASS**. Terminó 02:06:05 +02:00;
  duración Maven 47,081 s. 61 unitarias/HTTP aisladas + 37 de integración =
  **98 pruebas, 0 fallos, 0 errores, 0 omitidas**. Incluye regresión 001/002.
- Spotless ejecutado en `validate`: PASS. SpotBugs Max/Low: 0 hallazgos, 0 errores.
  No se omitieron pruebas ni se redujo el umbral.
- `mvnw.cmd dependency:list -DoutputFile=target/dependencias.txt
  -DappendOutput=false -Dstyle.color=never`: PASS a las 02:06:09 +02:00.
  Sin dependencias nuevas; archivo entregado para la auditoría del coordinador.
- Java Eclipse Adoptium 21.0.12.1, Spring Boot 4.0.8, PostgreSQL 17.11 real en
  Testcontainers con imagen fijada por digest. JAVA_HOME explícito;
  MAVEN_USER_HOME, TEMP/TMP y repositorio Maven dentro del workspace. Acceso al
  motor Docker local mediante permiso escalado autorizado para estas pruebas.
- Evidencias principales: `backend-verify-final.log`,
  `backend-junit-resultados.csv`, `backend-failsafe-final.xml`,
  `backend-dependencias.log`. El CSV enumera los 98 casos JUnit observados.
- `backend-huellas.csv`: SHA-256 de los 24 archivos nuevos/modificados de este
  escritor. Las huellas identifican estas fuentes, sin afirmar estado Git.
- Revisión acotada de logs backend AG-011: ningún JWT completo ni clave privada
  detectado; `backend-revision-logs.json`. Las pruebas comprueban separadamente
  ausencia de datos fiscales/contacto en eventos de aplicación y logs PostgreSQL.

## Cambios y archivos

18 nuevos: 14 clases en `proveedores/{dominio,aplicacion,persistencia,http}`, V3 y
tres clases de pruebas (`ProveedorDominioTest`, `ErroresProveedorTest`,
`ProveedoresIT`). Seis modificados: `SeguridadTecnica`, `ErroresControlados`,
`ContratoApi`, `BaseVerificableIT`, `IdentidadAccesoIT` y
`spotbugs-exclusiones.xml`. Ningún archivo eliminado. Lista exacta en las huellas.

V3 crea el catálogo, unique fiscal compuesto incluidos inactivos, restricciones,
índices y SELECT/INSERT/UPDATE para gestion_app sin DELETE/DDL. País se almacena
en varchar(2) con CHECK exacto de dos mayúsculas, evitando padding de char(2).
ISO se valida en dominio. No se modificaron V1/V2. Los índices no constituyen
un benchmark ni una garantía de latencia para la previsión de 50.000 filas.

Las seis operaciones de `/api/proveedores` usan DTO público sin normalizado,
entrada cerrada y sin coerción de versión. Seguridad HTTP y servicio exigen
permisos; roles se suman. Consultas parametrizadas, LIKE literal escapado,
filtros AND, offset acotado y orden cerrado con id asc de desempate. Cambios
mediante UPDATE id/version; estado repetido bajo bloqueo y versión vigente no
incrementa fecha/versión ni emite segundo evento. Eventos de éxito tras commit.

## Esperado frente a observado

| Criterio | Esperado y comprobación concreta | Observado |
|---|---|---|
| PR-01 | Alta 201/Location, UUID y fechas servidor, activo/version0, inválidos sin fila; IT alta/entrada inválida | PASS backend |
| PR-02 | DTO público, activos visibles y no visible/inexistente404; IT matriz/visibilidad | PASS backend |
| PR-03 | Literal %, _, escape; acentos, AND, normalización fiscal, páginas, límites y desempate; IT búsqueda/filtros | PASS backend |
| PR-04 | PUT preserva id/creadoEn/activo, incrementa versión/fecha, rollback duplicado; IT edición | PASS backend |
| PR-05 | Baja sin DELETE; repetición vigente sin evento/versión/fecha y ocultación; IT estados | PASS backend |
| PR-06 | Reactivación administrador/unión, repetición vigente y obsoleta409; IT estados | PASS backend |
| PR-07 | NFKC, ROOT, espacios Unicode incluido U+0085, expansiones, país/puntuación y unique inactivos; unitarias e IT | PASS backend |
| PR-08 | Cuatro roles y dos uniones, CSRF todos mutables, desconocido/default403; IT matriz y HTTP aislado | PASS backend |
| PR-09 | Edición obsoleta no sobrescribe; dos conexiones reales en alta/edición/estado con bloqueo acreditado en pg_stat_activity | PASS backend |
| PR-10 | Angular y E2E | Fuera de propiedad; entrega frontend/coordinador |
| PR-11 | Tipos/extras/internos rechazados, logs seis resultados sin cuerpos/contactos, rollback sin éxito, 400/401/403/404/409/500/503 controlados | PASS backend |
| PR-12 | V3 base nueva, actualización desde V1/V2 preservando usuario, segundo arranque, roles DB y verify completo | PASS backend; CI/auditoría/docs/Compose coordinador |

Las 43 pruebas nuevas son 24 de dominio/entrada, cuatro de errores HTTP y quince
IT. Las tres carreras esperan dos conexiones PostgreSQL bloqueadas antes de
liberarlas; alta produce un éxito y un duplicado, edición/estado un éxito y una
versión obsoleta. No se simula PostgreSQL en esas pruebas. La prueba de rollback
comprueba fila ausente y cero eventos antes/después del rollback externo.

## Fallos conservados y correcciones

1. Compilación inicial: import `Header` OpenAPI ausente. Añadido; compilación y
   unitarias siguientes PASS (`backend-compilacion-inicial.log`,
   `backend-unitarias-inicial.log`).
2. Revisión R00301/R00302: incorporados U+0085 y Clock truncado a microsegundos;
   unitarias Unicode y POST/GET/PUT con Clock de nanosegundos PASS.
3. CSRF: Compose detectó que Bearer borraba la cookie y difería su reposición.
   Reproducción con jar respetando Set-Cookie FAIL tras alta201 en
   `backend-csrf-reproduccion.log`. Primera corrección: materialización del token
   diferido mediante `setCsrfRequestAttributeName(null)`; conserva rotación y
   validación cookie/cabecera. Jar alta→GET→PUT→baja→reactiva PASS y falta de
   cabecera403. `backend-csrf-correccion1.log` y verify final lo acreditan.
4. R00303: OpenAPI declara conjuntos required completos Alta4/Edicion5/Estado1;
   la prueba compara los conjuntos exactos y additionalProperties=false.
5. Verify inicial: las 98 pruebas pasaron, SpotBugs marcó dos EI_EXPOSE_REP2.
   Primera corrección: JdbcTemplate privado construido con DataSource, conforme
   al repositorio de identidad; desapareció ese aviso, quedó el puerto inyectado.
   Segunda corrección: exclusión justificada de ese falso positivo limitada al
   constructor de ServicioProveedores, campo repositorio y patrón EI_EXPOSE_REP2.
   Dependencia Spring privada/final sin getter; una copia del repositorio no es
   una defensa válida. Sin exclusiones amplias ni cambio de umbral. Enfocada y
   verify final PASS; evidencias `backend-spotbugs-correccion1/2.log`.
6. Ejecución aislada inicial de `ErroresProveedorTest` bajo sandbox quedó sin
   resultado y se interrumpió; no se declara PASS. Log conservado
   `backend-http-errores.log`. Posteriores ejecuciones autorizadas con permiso
   escalado y verify final ejecutaron sus cuatro casos con PASS. No se atribuye
   una causa técnica no demostrada a aquella interrupción.

## Pendiente y siguiente paso

Ningún fallo backend conocido pendiente tras verify final. No hay porcentaje de
cobertura instrumentada ni afirmación OWASP completa. Auditoría de dependencias,
build/Compose definitivo, frontend/E2E, documentación global y aceptación son
responsabilidad de sus escritores/revisor/persona responsable. CI remota depende
del push humano. Backend congelado para revisión e integración de evidencias;
no se declara 003 aceptada, integrada ni publicada.
