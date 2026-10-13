# Versiones vigentes e historial de investigación

**Estado vigente AG-010:** dependencias finales verificadas localmente; BC 1.86,
auditorías npm/Maven y verify PASS. CI remota y aceptación humanas pendientes.
El apartado final «AG-010» recoge la ampliación de identidad.
Los bloques siguientes conservan sus estados históricos, incluido el bloqueo
inicial de T001; esas cabeceras no describen el estado actual del proyecto.

# Versiones de 001 — Investigación de T001

**Estado:** T001 bloqueada; registro factual pendiente de revisión humana.
**Fecha de consulta:** 2026-10-13, Europe/Madrid.
**Ejecución:** AG-004, reanudación de AG-003.

Este documento conserva resultados de consultas reales, no una selección final
de dependencias. No se ha generado código, instalado herramientas ni creado
un lockfile. Rigen la [especificación](../../especificaciones/001-base-verificable/especificacion.md),
el [plan aprobado](../../especificaciones/001-base-verificable/plan.md) y sus
[tareas](../../especificaciones/001-base-verificable/tareas.md).

## Bloqueo antes de generar código

El apartado 3 del plan dispone: «No se usan versiones preliminares, `latest`,
snapshots ni cambios de versión mayor por comodidad».

Los metadatos del registro oficial npm muestran que `@angular/build` 21.2.26,
versión estable más reciente de la línea aprobada, declara en `dependencies`
`rolldown: 1.0.0-rc.4`. No figura como dependencia opcional; la dependencia
opcional declarada es `lmdb: 3.5.1`. Es una dependencia directa del constructor
y transitiva respecto de la aplicación que lo incorporaría.

La consulta completa encontró 40 versiones estables de `@angular/build` 21.x.
Todas declaraban al menos una dependencia directa con versión preliminar;
ninguna quedó libre de ella en esa comprobación. Ejemplos observados:

| Constructor estable | Dependencia preliminar declarada |
|---|---|
| 21.0.0 | `rolldown: 1.0.0-beta.47` |
| 21.1.5 | `rolldown: 1.0.0-beta.58` |
| 21.2.25 | `rolldown: 1.0.0-rc.4` |
| 21.2.26 | `rolldown: 1.0.0-rc.4` |

Esto impide cerrar la selección de la ruta estándar de construcción Angular
con una lectura literal de la prohibición aprobada. No demuestra que Angular
21 sea inviable con cualquier otra solución de construcción. Tampoco demuestra
por sí solo una vulnerabilidad: no se ha ejecutado una auditoría de paquetes.

Fuentes leídas:

- [Metadatos completos de @angular/build](https://registry.npmjs.org/@angular%2Fbuild).
- [Metadatos de @angular/build 21.2.26](https://registry.npmjs.org/@angular%2Fbuild/21.2.26).
- [Metadatos de Angular CLI 21.2.26](https://registry.npmjs.org/@angular%2Fcli/21.2.26).

Integridad publicada para el archivo `build-21.2.26.tgz`:
`sha512-DAG5MvD58NxWG5byvXeIbuMuefr7aFk2VNjmGagE5PZ+dvXv5rvS+G2aVks4dqFxiXvSbJknZwJVVHuruKApXQ==`.
Se leyó el valor del registro; no se descargó el archivo ni se comprobó su hash.

## Decisión humana necesaria

No se ha cambiado la prohibición, sustituido `rolldown` mediante `overrides`,
elegido una línea mayor distinta ni adoptado otro constructor.

La persona responsable debe decidir entre una excepción concreta para la
dependencia transitiva `rolldown` 1.0.0-rc.4 impuesta por el constructor estable
21.2.26, o revisar la solución de construcción. Una excepción, si se aprueba,
deberá quedar documentada antes de continuar y conservar la fijación exacta,
la auditoría de dependencias y las pruebas exigidas. No equivaldría a aceptar
vulnerabilidades ni a autorizar otras versiones preliminares.

Si se interpreta que la prohibición solo alcanza las herramientas seleccionadas
directamente y permite las dependencias preliminares elegidas por sus autores,
esa interpretación también requiere aclaración humana; no se ha supuesto.
La aprobación de DT-08 delega parches compatibles, no una excepción a sus límites.

## Entorno comprobado y evidencia heredada

La evidencia de AG-003 se reutilizó tras comparar SHA-256 de los 40 archivos:
37 coincidían y solo diferían `MEMORY.md`, el CSV de ejecuciones y
`.codex/config.toml`. No había archivos añadidos, eliminados ni de aplicación.
Especificación, plan y tareas seguían presentes e idénticos. AG-003 se conserva
íntegro en el [registro de ejecuciones](../trazabilidad/ejecuciones-agentes.csv).

| Componente | Observación | Procedencia |
|---|---|---|
| Java y javac | Temurin 21.0.12.1 | AG-003; no reejecutados en AG-004. |
| Node.js / npm | 24.13.0 / 11.6.2 | AG-003; no reejecutados en AG-004. |
| Docker Client y Engine | 29.1.3 | AG-004, `docker version`, salida 0 tras escalación específica. |
| Docker Desktop | 4.55.0 (213807) | AG-004, salida del servidor en `docker version`. |
| Compose | v2.40.3-desktop.1 | AG-004, `docker compose version`, salida 0. |
| Contexto / servidor | `desktop-linux` / Linux `docker-desktop` | AG-004, contexto e información del motor, salidas 0. |
| Disco del host | 332196290560 bytes libres, 309,38 GiB | AG-004; estimación preventiva de 30 GiB de necesidad. |
| Recursos del motor | 20 CPU, 33318666240 bytes de memoria, unos 31,03 GiB | AG-004, consulta específica de solo lectura. |

`docker system df` terminó con salida 0: imágenes 47,29 GB, contenedores
1,242 GB, volúmenes 1,167 GB y caché de construcción 23,38 GB.
No se midió la cuota libre del disco virtual ni se borraron recursos Docker.

Las primeras consultas al motor recibieron `permission denied` en la tubería
`dockerDesktopLinuxEngine`. Los cuatro comandos A6 pasaron después de una
escalación limitada a esas consultas. Las seis consultas HTTPS iniciales
fallaron DNS en el sandbox (`curl` 6, HTTP 000); las consultas específicas
escaladas respondieron. No hubo rechazo de revisión automática.

Maven Central, npm, descargas Apache, Angular y springdoc devolvieron HTTP 200.
El registro Docker devolvió el desafío HTTP 401 esperado; la obtención anónima
del token y la consulta del manifiesto oficial `library/postgres:17` terminaron
con HTTP 200. Digest observado:
`sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3`.
La etiqueta móvil se consultó para probar acceso: no es una imagen seleccionada
para la aplicación ni se descargaron sus capas.

## Versiones candidatas, todavía sin fijación final

| Componente | Resultado observado | Compatibilidad o mantenimiento comprobados |
|---|---|---|
| Spring Boot | 4.0.8 | Documentación: Java 17–26. API oficial: soporte OSS de 4.0.x hasta 2026-12-31. |
| springdoc-openapi | 3.0.3 | Matriz oficial relaciona Boot 4.0.x con springdoc 3.0.x. |
| Maven | 3.9.16 | Último parche 3.9.x presente en los metadatos consultados; distribución y checksum pendientes. |
| Angular core/compiler | 21.2.25 | Angular 21 en LTS hasta 2027-06; matriz acepta Node 24.x, TypeScript >=5.9 <6.0 y RxJS ^7.4.0. |
| Angular CLI / build | 21.2.26 | Build admite core/compiler 21.x y TypeScript >=5.9 <6.0; bloqueo `rolldown` descrito arriba. |
| TypeScript | 5.9.3 | Compatible con la matriz Angular 21 consultada. |
| RxJS | 7.8.2 | Compatible con la matriz Angular 21 consultada. |
| PostgreSQL | 17.11 | Página oficial: versión 17 soportada hasta 2029-11-08; etiqueta exacta y digest final pendientes. |
| Node.js | 24.21.0 / npm 11.19.0 | Índice oficial: LTS Krypton, publicación 2026-09-07. Candidato; no instalado. |

Node local 24.13.0 satisface el rango de Angular, pero eso no acredita que
incluya todas las correcciones de seguridad posteriores. El sitio oficial
publica avisos de marzo, junio y julio de 2026. No se terminó el contraste
de cada aviso ni se modificó Node global. Una distribución local dentro del
workspace sería una opción a evaluar al reanudar, sin cambiar herramientas globales.

También se consultaron metadatos de `angular-eslint` 21.4.0, ESLint 9.39.5,
Prettier 3.9.10, jsdom 30.1.2 y Playwright 1.64.0; no se seleccionaron ni
instalaron. La consulta general de Vitest devolvió 5.0.4, pero el constructor
21.2.26 declara `^4.0.8`: falta resolver una versión 4.x compatible.
jsdom 30.1.2 exige, en la línea Node 24, al menos 24.15.0.
Estos resultados parciales no constituyen un conjunto de herramientas compatible.

Quedan pendientes las versiones resueltas de Flyway, driver PostgreSQL,
Testcontainers, herramientas QA del backend, imágenes exactas, referencias
de Actions, integridad de descargas y auditoría completa de vulnerabilidades.

## Fuentes oficiales consultadas

- [Metadatos Spring Boot](https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-dependencies/maven-metadata.xml).
- [Requisitos Spring Boot 4.0](https://docs.spring.io/spring-boot/4.0/system-requirements.html).
- [Calendario oficial Spring Boot](https://api.spring.io/projects/spring-boot/generations).
- [Metadatos Maven](https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/maven-metadata.xml).
- [Metadatos springdoc](https://repo.maven.apache.org/maven2/org/springdoc/springdoc-openapi-starter-webmvc-ui/maven-metadata.xml) y [matriz springdoc](https://springdoc.org/).
- [Compatibilidad Angular](https://angular.dev/reference/versions) y [soporte Angular](https://angular.dev/reference/releases).
- [Angular core](https://registry.npmjs.org/@angular%2Fcore), [TypeScript](https://registry.npmjs.org/typescript) y [RxJS](https://registry.npmjs.org/rxjs).
- [Política de versiones PostgreSQL](https://www.postgresql.org/support/versioning/).
- [Índice Node.js](https://nodejs.org/dist/index.json) y [avisos de seguridad Node.js](https://nodejs.org/en/blog/vulnerability).

Las consultas fueron de lectura y no enviaron contenido del repositorio.
Las fuentes son cambiantes: fecha y valores observados no garantizan su estado futuro.

## Estado de ejecución y límites

| Etapa | Resultado real |
|---|---|
| Preflight A1–A10 | PASS, con evidencia heredada y nueva distinguidas en AG-004. |
| B1 / B3 | NO DISPONIBLE con aislamiento requerido; planificador, explorer y revisor iniciados con workspace-write/auto_review, detenidos antes de operar. |
| B2 / B4 | NO DISPONIBLE como invocación nativa; skills SDD y documental leídas y aplicadas manualmente. |
| B5 | PASS; búsqueda y lectura reales mediante openaiDeveloperDocs. |
| Nivel utilizado | 3, ejecución secuencial; revisión de la misma sesión, no independiente. |
| T001 | Bloqueada durante selección; informe parcial, sin cerrar aceptación. |
| T002–T008 | No iniciadas; dependientes de T001. Este cierre documental no acredita T007 ni T008 completas. |

La revisión secuencial del paquete relacionó BV-01 con T001/T002/T004;
BV-02 con T002; BV-03 con T003; BV-04 con T002/T003/T005;
BV-05 con T002/T005; BV-06 con T004/T005; BV-07 con T005;
BV-08 con T002/T003/T004/T006; BV-09 con T006; BV-10 con T005/T007.
T007 y T008 consolidan/revisan todos los BV. DT-01 a DT-08 están presentes;
no se encontraron requisitos sin tarea ni tareas ajenas al alcance.
El hallazgo de versiones apareció después, al consultar fuentes de T001.

Sandbox efectivo: `workspace-write`; revisión de aprobaciones: `auto_review`;
red restringida con escalaciones concretas. `.codex/config.toml` contiene
`windows.sandbox = "elevated"`, pero eso no evitó el bloqueo inicial de la tubería.
La raíz adicional de visualizaciones no se utilizó. No se pidió Full Access,
no se cambiaron permisos globales y no se inició el implementador.

Inicio real: 2026-10-13T02:30:55+02:00; límite original de AG-004:
2026-10-13T12:30:55+02:00. La hora final se conserva en el CSV.
No se ejecutó Git, builds, pruebas de aplicación, CI ni despliegues.
No existen código, validación de aplicación ni borradores 002–008 creados por AG-004.

Incidencias de consulta conservadas: un error de recorte del prefijo del primer
archivo del inventario se corrigió y se repitió la comparación con éxito;
una variable PowerShell tipada XML impidió la primera lectura JSON npm y se
corrigió con una variable separada; la consulta aislada de `@angular/build`
21.0.9 devolvió 404, y el inventario completo posterior usó solo versiones
realmente publicadas. No hubo correcciones de código ni dos correcciones fallidas
del mismo problema. No se instalaron herramientas ni se descargaron paquetes.

## Manifiesto de commit propuesto

Un único grupo documental mantiene unidos el diagnóstico, la trazabilidad y
los resúmenes. Mensaje sugerido:
`docs: registrar AG-004 y bloqueo de versiones de 001`.

| Archivo | Cambio de AG-004 |
|---|---|
| `docs/documentaciondev/versiones.md` | Nuevo informe de T001, fuentes, bloqueo y decisiones pendientes. |
| `docs/trazabilidad/ejecuciones-agentes.csv` | Añadir AG-004 con tiempos y resultados; conservar íntegros los registros anteriores. |
| `MEMORY.md` | Añadir estado vigente de reanudación conservando todo el contenido anterior. |
| `README.md` | Reflejar preflight superado y T001 bloqueada. |
| `docs/README.md` | Enlazar el informe y reflejar preflight, fallback y estado real. |
| `especificaciones/README.md` | Reflejar T001 bloqueada y tareas siguientes no iniciadas. |

`.codex/config.toml` ya había cambiado antes de AG-004: se verificó y no se
modificó; no forma parte de este grupo propuesto. No hay grupos de código,
pruebas/CI ni borradores posteriores. Ninguna operación Git fue ejecutada.

La comprobación del cierre revisó 57 enlaces internos de los documentos
afectados, sin destinos ausentes ni espacios finales. Una búsqueda acotada de
patrones de secretos no encontró coincidencias; no es una garantía absoluta.
El inventario tiene 41 archivos frente a los 40 anteriores: un documento nuevo,
cero eliminaciones y solo las modificaciones documentales descritas, además
del cambio previo de configuración ajeno a AG-004. La revisión fue secuencial
y no independiente; el informe queda pendiente de revisión humana.

## AG-005 — excepción humana aprobada y reanudación

Los apartados anteriores conservan íntegra la investigación y el cierre AG-004.
La decisión humana del 2026-10-13 levanta exclusivamente el bloqueo de selección
mediante [ADR-0001](../decisiones/ADR-0001-dependencia-transitiva-rolldown-angular-21.md),
aprobado antes de código. AG-005 comienza a las 02:47:42 +02:00 y mantiene el
límite original de 12:30:55 +02:00.

Se autoriza `@angular/build@21.2.26` estable con su dependencia oficial declarada
`rolldown@1.0.0-rc.4`, transitiva para la aplicación. Solo se incluyen además
los subpaquetes oficiales o bindings que esa versión requiera automáticamente,
de la misma familia de publicación y no añadidos manualmente.
La excepción no es general: otro preliminar obliga a detenerse.

Se rechazan abandonar Angular 21, cambiar de versión mayor y forzar Rolldown
mediante override. No se añadirá Rolldown directamente ni se usarán overrides,
resolutions, force, legacy-peer-deps, latest o desactivación de integridad.
Se mantienen versiones directas estables/exactas, lockfile, integridad,
procedencia, auditoría, build, pruebas y reproducción con npm ci.
Una etiqueta rc conserva menor garantía de estabilidad semántica que una final.
El ADR recoge los riesgos y condiciones de parada completos.

Node 24.13.0 y npm 11.6.2 se conservan por instrucción humana; TypeScript se
mantiene en 5.9 compatible. Las consultas y candidatos antiguos no equivalen
a una instalación ni a controles superados. Las comprobaciones específicas
solicitadas están pendientes al registrar esta reanudación.

### AG-005: comprobación npm anterior a instalación — PASS

Los siete comandos siguientes se ejecutaron realmente con npm, registro oficial
`https://registry.npmjs.org/`, caché dentro de `tmp/npm-cache`, sin instalar
paquetes. Todos terminaron con código 0:

| Comando solicitado | Valor observado |
|---|---|
| `npm view @angular/build@21.2.26 version` | `21.2.26` |
| `npm view @angular/build@21.2.26 dependencies.rolldown` | `1.0.0-rc.4` |
| `npm view @angular/build@21.2.26 dist.integrity` | `sha512-DAG5MvD58NxWG5byvXeIbuMuefr7aFk2VNjmGagE5PZ+dvXv5rvS+G2aVks4dqFxiXvSbJknZwJVVHuruKApXQ==` |
| `npm view rolldown@1.0.0-rc.4 version` | `1.0.0-rc.4` |
| `npm view rolldown@1.0.0-rc.4 license` | `MIT` |
| `npm view rolldown@1.0.0-rc.4 repository` | `git+https://github.com/rolldown/rolldown.git`, tipo `git`, directorio `packages/rolldown` |
| `npm view rolldown@1.0.0-rc.4 dist.integrity` | `sha512-V2tPDUrY3WSevrvU2E41ijZlpF+5PbZu4giH+VpNraaadsJGHa4fR6IFwsocVwEXDoAdIv5qgPPxgrvKAOIPtA==` |

Se utilizó `--json` para conservar valores estructurados. La mención `git` en
los metadatos identifica la procedencia; no es una operación Git ejecutada.
La coincidencia de estos metadatos permite continuar con la comprobación de
la cadena. Integridad del archivo descargado, instalación, auditoría, npm ci,
build y pruebas siguen pendientes; no se deducen de un `npm view` correcto.

### AG-005: selección exacta del conjunto frontend para resolver el lockfile

Antes de código funcional se selecciona el conjunto de dependencias de
construcción autorizado, para comprobar primero su resolución y auditoría.
Esto todavía no cierra T001 ni acredita T004.

| Dependencia directa | Versión elegida |
|---|---|
| Angular core/common/compiler/platform-browser/router y compiler-cli | 21.2.25 |
| Angular CLI y build | 21.2.26 |
| TypeScript / RxJS / tslib | 5.9.3 / 7.8.2 / 2.8.1 |
| Vitest / jsdom | 4.1.11 / 27.4.0 |
| ESLint y @eslint/js | 9.39.5 |
| angular-eslint / typescript-eslint | 21.4.0 / 8.71.2 |
| Prettier / Playwright | 3.9.10 / 1.64.0 |
| @types/node | 24.19.2 |
| Node / npm utilizados | 24.13.0 / 11.6.2, conservados según instrucción humana |

Los paquetes de aplicación Angular 21.2.25 y CLI/build 21.2.26 tienen ciclos
de parche distintos; los metadatos oficiales y peers del constructor admiten
esa combinación dentro de Angular 21. No se cambia el constructor aprobado.
Vitest 4.1.11 cumple el peer `^4.0.8`; jsdom 27.4.0 admite Node >=24.0.0,
a diferencia del candidato 30.1.2 que exigía al menos 24.15.0.
No se utiliza aquel candidato incompatible ni se cambia Node.
Las licencias consultadas de Angular, Rolldown, Vitest, jsdom y typescript-eslint
son MIT; tslib publica 0BSD. Las dependencias transitivas se revisarán al resolver.

`npm view rolldown@1.0.0-rc.4 engines dependencies optionalDependencies --json`
terminó con código 0: admite Node `^20.19.0 || >=22.12.0`, declara
`@oxc-project/types =0.113.0` y `@rolldown/pluginutils 1.0.0-rc.4`.
Sus 13 bindings opcionales declarados llevan exactamente `1.0.0-rc.4`.
Esto concuerda con la familia permitida; falta contrastar el lockfile completo.

### AG-005: resolución y parada por gensync — estado vigente

La resolución solicitada se preparó en `frontend/package.json`, `.npmrc` y
`package-lock.json`, sin código funcional. Desde `frontend/` se ejecutó:

`npm install --package-lock-only --ignore-scripts --no-audit --no-fund`

Resultado: código 0, `up to date in 22s`; lockfile v3 con 689 entradas de
paquetes, excluida la raíz. No existe `frontend/node_modules`, no se instalaron
paquetes ni se ejecutaron scripts de dependencias. La caché npm se conserva
solo en `tmp/npm-cache`, excluida por las reglas existentes del repositorio.

El control del lockfile comprobó versiones preliminares, procedencia,
integridades publicadas y rutas introductorias. Resultado global: FALLÓ,
código 1, por `gensync@1.0.0-beta.2`, ajena a la excepción aprobada.
Se encontraron 16 entradas preliminares: Rolldown, pluginutils y 13 bindings
permitidos, más gensync. No hubo otra entrada preliminar fuera de esa lista.
Las 689 entradas tienen integridad publicada y origen resuelto en npm oficial;
esto no verifica la integridad de una instalación, que no se realizó.

Árbol Rolldown **resuelto en el lockfile, no instalado**:

```text
@angular/build@21.2.26
└── rolldown@1.0.0-rc.4
    ├── @oxc-project/types@0.113.0
    ├── @rolldown/pluginutils@1.0.0-rc.4
    └── 13 bindings opcionales @rolldown/binding-*@1.0.0-rc.4
```

El único paquete que declara Rolldown en el lockfile es `@angular/build`
21.2.26; no hay dependencia directa, overrides ni resolutions.
El paquete no autorizado llega por estas rutas observadas:

```text
@angular/build@21.2.26 → @babel/core@7.29.7 → gensync@1.0.0-beta.2
@angular/compiler-cli@21.2.25 → @babel/core@7.29.7 → gensync@1.0.0-beta.2
```

Babel declara `gensync: ^1.0.0-beta.2`; `istanbul-lib-instrument@6.0.3`
también declara Babel. El lockfile registra licencia MIT y origen npm oficial
para gensync. No se infiere una vulnerabilidad de su etiqueta beta.

Se aplica la orden humana: «Si aparece cualquier otra dependencia preliminar
fuera de esta cadena, detente y solicita otra decisión». No se intentó reparar,
reemplazar ni exceptuar gensync. Es el primer fallo de este control y no hubo
correcciones ni reintentos del mismo problema.

`npm explain rolldown`, `npm ls @angular/build rolldown --all`,
`npm audit --audit-level=high`, instalación, `npm ci`, builds y pruebas quedan
NO EJECUTADOS por esta parada previa. El control completo de seguridad y
reproducibilidad sigue pendiente; no se afirma ausencia de vulnerabilidades.
T001 queda bloqueada y T002–T008 no se iniciaron. Los manifiestos solo forman
parte de la comprobación previa de dependencias autorizada en AG-005.

Existe ahora [validación parcial de AG-005](../../especificaciones/001-base-verificable/validacion.md),
con resultados observados y matriz BV-01–BV-10. No acredita aceptación local
ni remota de 001. La ausencia de validacion.md descrita más arriba pertenece
al cierre histórico AG-004, preservado íntegro.

Huellas de los artefactos resueltos y comprobados:

| Archivo | SHA-256 |
|---|---|
| `frontend/package.json` | `B183F3C76F343974E4703BFB7A68586B8D3108FFE609B80B9988F308E8BC5147` |
| `frontend/package-lock.json` | `7DEE45F2789B312968EFC716FB269C14E51836ACEA17D46B13BA41E7BF98A25F` |
| `frontend/.npmrc` | `E5D8F4340708A6F899E2A794BC3E947520F78156C6E648B725C68A192EFD6BDB` |

La revisión documental de cierre y conservación histórica es de la misma
sesión, no independiente. No se ejecutó Git, Full Access, instalación global,
CI, despliegue ni dominios funcionales posteriores. El límite sigue siendo
2026-10-13 12:30:55 +02:00; la hora final real se registra en AG-005.

Consultas auxiliares antes de la parada: el BOM oficial Boot 4.0.8 resolvió
Flyway 11.14.1, PostgreSQL JDBC 42.7.13, Testcontainers 2.0.5, JUnit 6.0.3 y
Surefire 3.5.6. Los metadatos Maven mostraron Wrapper 3.3.4, Spotless 3.10.4,
SpotBugs Maven 4.10.5.0 y google-java-format 1.37.0 como candidatos estables;
no se seleccionaron definitivamente ni se descargaron. La URL candidata
`apache-maven-3.9.16-bin.zip.sha256` devolvió 404: integridad Maven sin resolver,
no presentada como superada. No se prosiguió esa investigación tras el bloqueo.

### AG-005: manifiesto de entrega y commit sugerido

Un único grupo mantiene coherentes decisión, manifiestos, evidencia y estados.
Mensaje sugerido: `build: registrar excepción Rolldown y resolución bloqueada de 001`.
Es una propuesta para revisión humana, no una base lista para integrar.

| Archivo | Cambio |
|---|---|
| `docs/decisiones/ADR-0001-dependencia-transitiva-rolldown-angular-21.md` | Nuevo; excepción técnica expresamente aprobada. |
| `especificaciones/001-base-verificable/plan.md` | Regla precisa con excepción, límites y controles aprobados. |
| `frontend/package.json` | Nuevo; dependencias directas exactas para resolver la cadena. |
| `frontend/package-lock.json` | Nuevo; resolución preservada con el preliminar no autorizado identificado. |
| `frontend/.npmrc` | Nuevo; registro oficial, versiones exactas y control estricto de engines. |
| `especificaciones/001-base-verificable/validacion.md` | Nueva validación parcial, bloqueada y sin pruebas inventadas. |
| `docs/documentaciondev/versiones.md` | Adiciones AG-005; se conserva íntegra la evidencia anterior. |
| `docs/fuentes.md` | Añadir fuentes npm y procedencia de la excepción. |
| `docs/README.md` | Enlazar ADR/validación y reflejar la parada actual. |
| `README.md` | Estado real de AG-005. |
| `especificaciones/README.md` | Estado de tareas y validación parcial existente. |
| `MEMORY.md` | Añadir reanudación y cierre; preservar todo lo anterior. |
| `docs/trazabilidad/ejecuciones-agentes.csv` | Añadir AG-005; preservar AG-001–AG-004 byte a byte. |

La caché `tmp/npm-cache` es operativa y queda fuera del manifiesto.
`.codex/config.toml` no se modificó. No hay commits propuestos de implementación,
pruebas/CI ejecutadas ni borradores posteriores. Las operaciones Git corresponden
exclusivamente a la persona responsable y no se han ejecutado.

## AG-006 — selección vigente y continuidad

La historia anterior queda íntegra. AG-006 aplica ADR-0002 y levanta la parada
por etiqueta preliminar transitiva. Inicio real 2026-10-13 10:16:08 +02:00;
límite nuevo 20:16:08 +02:00; rama declarada `feature/001-base-verificable`.
Preflight reutilizado de AG-003/004/005, sin repetirlo ni consultar Git.
Inventario inicial: 46 archivos esenciales, sin código funcional inesperado;
lockfile idéntico al de AG-005. Evidencia en `qa/evidencias/ag006/`.

Se mantienen todas las versiones directas frontend exactas seleccionadas en AG-005.
Generación con CLI 21.2.26, routing, strict, CSS, skip-git y skip-install.
Inventario completo único: 689 entradas, 16 preliminares transitivas controladas,
ninguna directa preliminar, ninguna URL no oficial ni SRI ausente/incoherente.
Rolldown, pluginutils y 13 bindings rc.4; Gensync beta.2 mediante Babel 7.29.7.
La clasificación estática se completa con instalación, auditoría, build y pruebas.

`npm ci` con caché explícita en el workspace: PASS, 584 paquetes instalados.
Incidencia preservada: la primera asignación PowerShell de caché falló y npm
usó su caché predeterminada; terminó instalando 584 paquetes. No se cambiaron
herramientas globales. Se corrigió la ruta y se repitió con éxito; no se borró
contenido de la caché ajena al workspace. Ambas salidas quedan conservadas.
`npm explain rolldown`, `npm explain gensync` y `npm ls --all`: PASS, salida 0.
Auditorías producción/completa: salida 0, cero vulnerabilidades informadas.
Esto no garantiza ausencia de vulnerabilidades desconocidas.
ESLint 9.39.5 informa fin de soporte: advertencia; no es hallazgo de explotación.

Selección backend sobre los metadatos oficiales ya consultados en AG-005:

| Componente | Versión exacta | Gestión |
|---|---|---|
| Java Temurin | 21.0.12.1 | Entorno heredado y Docker de la misma versión |
| Spring Boot | 4.0.8 | Parent/BOM oficial |
| Maven / Wrapper | 3.9.16 / 3.3.4 | Distribución y plugin oficiales |
| springdoc-openapi | 3.0.3 | Directa exacta |
| Flyway / PostgreSQL JDBC | 11.14.1 / 42.7.13 | BOM Boot 4.0.8 |
| Testcontainers / JUnit | 2.0.5 / 6.0.3 | BOM Boot 4.0.8 |
| Surefire / Failsafe | 3.5.6 / 3.5.6 | Parent / plugin exacto |
| Spotless / google-java-format | 3.10.4 / 1.37.0 | Plugins exactos |
| SpotBugs Maven | 4.10.5.0 | Plugin exacto |
| PostgreSQL | 17.11-bookworm | Imagen oficial por digest |
| Nginx | 1.28.3-trixie | Imagen oficial por digest |
| Node / npm | 24.13.0 / 11.6.2 | Se conservan; sin actualización global |

Maven descargado desde Maven Central y verificado con SHA-512 publicado.
SHA-256 calculado del ZIP validado:
`5af3b743dd8b876b5c45da33b676251e5f1687712644abb4ee519ca56e1d89ce`.
Se fijará en Wrapper; la distribución local queda solo en `tmp/herramientas`.
Docker Engine sigue accesible (29.1.3) tras una escalación concreta de lectura.
Digests de imágenes consultados en Docker Hub oficial se conservan en JSON.
Resolución/build/QA backend y aceptación completa siguen pendientes en este punto.

### AG-006: parches de seguridad compatibles

OSV-Scanner 2.7.0 se descargó y verificó con SHA-256 oficial. La auditoría
offline de 125 componentes encontró 17 coincidencias: 10 altas, 4 moderadas y
3 críticas, en Jackson 2/3 y Tomcat. El informe inicial se conserva completo.
No se enviaron metadatos del proyecto: se descargó el volcado público Maven.
La revisión automática rechazó antes la alternativa de consulta API por lote;
el script definitivo compara localmente con `--offline` y sin resolver paquetes.

Los tres casos Tomcat requieren DIGEST, FORM o restricciones del contenedor,
ausentes en 001: se utiliza la cadena Spring Security, sin cuentas ni login.
Los casos Jackson requieren deserialización de entradas o configuraciones
polimórficas no expuestas en el contrato GET de 001. No se declara que sean
inofensivos para incrementos futuros ni se ignoran sus avisos.

Con el margen técnico de AG-006 se fijan parches estables de las mismas líneas:
Tomcat **11.0.25**, Jackson 2 BOM **2.21.7** y Jackson 3 BOM **3.1.7**.
Los tres POM oficiales devolvieron HTTP 200 en Maven Central. Boot sigue **4.0.8**,
último parche 4.0.x publicado en la consulta motivada por estos hallazgos.
Se usan las propiedades públicas de gestión de versiones de Boot para mantener
alineadas las familias; no se cambian mayores, ni el lockfile npm, ni sus cadenas.
La aceptación requiere nueva resolución, auditoría y regresión tras estos parches.

### AG-006: resultado de la selección al cierre

Parches aplicados: resolución, 10 unitarias/HTTP, 3 integraciones PostgreSQL,
empaquetado, SpotBugs y Compose PASS. Auditoría Maven offline: 125 componentes
y cero coincidencias; npm producción/completa final: cero vulnerabilidades informadas.
Preparador OSV-Scanner 2.7.0 y base local comprobados. Wrapper con el SHA-256
anterior funciona en Windows y Docker Linux. Frontend: 11 pruebas, 5 E2E, tipos,
lint, formato y build PASS. Actionlint 1.7.12 PASS. CI remota no ejecutada.
Spotless sigue fallando con InvocationTargetException tras dos correcciones;
verify obligatorio y aceptación global pendientes. Selección estable no equivale
a comprobación exitosa. Lockfile y Node/npm globales sin modificar.
Resultados y límites en el [informe AG-006](../trazabilidad/AG-006-informe.md)
y la [validación](../../especificaciones/001-base-verificable/validacion.md).

## AG-008 — alineación aprobada de google-java-format

Decisión humana expresa del 2026-10-13, encargo «EJECUCIÓN AUTORIZADA: AG-008»,
registrado a las 11:39:31 +02:00. Referencia técnica: [AG-007](../trazabilidad/AG-007-informe.md),
que identifica la incompatibilidad binaria de la API `Style.valueOf(String)`.

Se cambia exclusivamente **google-java-format 1.37.0 → 1.36.1** en
`backend/pom.xml`, `build/plugins/plugin/configuration/java/googleJavaFormat/version`.
Spotless permanece fijado en **3.10.4** y Java en **21**. La decisión humana
aprueba 1.36.1 como versión compatible adoptada por la línea de Spotless utilizada;
la compatibilidad local deberá confirmarse con las comprobaciones siguientes.
Se conserva `style=AOSP`, valor ya configurado dentro de google-java-format;
no se cambia el estándar ni se introduce otro formateador.

El alcance es exclusivamente la herramienta de construcción y formato: no afecta
al runtime de la aplicación. No reduce ni elimina comprobaciones, archivos main/test
ni el goal obligatorio `check` ligado a `validate`, incluido en `verify`.
No se crea un ADR: no existe cambio de arquitectura.

Pruebas requeridas para confirmar la reparación: POM efectivo (3.10.4/1.36.1,
sin segunda referencia activa 1.37.0), `spotless:apply`, comparación de contenido
y SHA-256 de todos los Java, `spotless:check`, `mvnw.cmd verify` sin omisiones
y regresión integrada Compose/E2E. Los resultados se añadirán tras ejecutarlos;
esta decisión no equivale a una prueba superada. La historia anterior se conserva.

### AG-008: resultado comprobado de la alineación

POM efectivo **3.10.4/1.36.1**, sin referencia activa 1.37.0; `style=AOSP` y
check en validate conservados. Java efectivo Temurin 21.0.12.1+1-LTS.
`spotless:apply` y `spotless:check`: PASS, salida 0. Siete Java reformateados,
14 comparados por contenido/SHA-256 y tokens, sin cambios funcionales detectados.
`mvnw.cmd verify`: PASS sin omisiones, salida 0, 13 pruebas backend y SpotBugs.
Regresión Compose/E2E: PASS, 5 E2E, persistencia, caída 503 real y recuperación;
servicios detenidos con volumen conservado. No se cambió otra dependencia.

Los logs de apply acreditan Spotless 3.10.4 y la descarga de google-java-format
1.36.1 desde Maven Central. Primer effective-pom falló por acceso DNS del sandbox;
repetición con red autorizada PASS. No se utilizó fallback -U ni se cambió `.m2` global.
Resultados, tiempos, advertencias y límites en [AG-008](../trazabilidad/AG-008-informe.md)
y [validación](../../especificaciones/001-base-verificable/validacion.md).
Se propone verificación local; CI remota, revisión independiente, aceptación e
integración siguen pendientes. No se sustituye ningún resultado histórico.

## AG-010 — dependencias y herramientas de identidad

La autorización 002 conserva Java 21, Boot 4.0.8, Angular 21 y PostgreSQL 17.
Se añade `spring-boot-starter-security-oauth2-resource-server` gestionado por
el BOM 4.0.8: resuelve Spring Security 7.0.7 y Nimbus JOSE JWT 10.4.
Argon2PasswordEncoder utiliza `org.bouncycastle:bcprov-jdk18on:1.86`, directa
estable y exacta. No se añade un Authorization Server.

La selección inicial Bouncy Castle 1.83 produjo cinco avisos OSV: GOST,
Name Constraints, LDAP, FrodoKEM y ASN.1. El código no usa esas funciones, pero
se sustituye por 1.86 estable oficial dentro de la línea mayor 1. El inventario
final de 132 componentes pasa OSV offline sin coincidencias. La historia inicial
y su evaluación se conservan en `qa/evidencias/ag010/auditorias.md`.
Fuente primaria de versiones: [metadatos Maven Central](https://repo.maven.apache.org/maven2/org/bouncycastle/bcprov-jdk18on/maven-metadata.xml),
consultados durante AG-010; copia exacta en sus evidencias.

El lockfile Angular permanece idéntico al inicio. No se repite la investigación
AG-006 de transitivas preliminares; se aplica ADR-0002. La instalación npm ci,
build y pruebas se ejecutan, al igual que auditorías actuales npm de producción
y completas, ambas salida 0. Se añade comprobación OSV offline con volcados
públicos completos: 7 componentes de producción y 653 únicos en total,
sin coincidencias conocidas. No implica ausencia de vulnerabilidades desconocidas.

La CI fija Docker Engine 29.1.3 mediante
[docker/setup-docker-action](https://github.com/docker/setup-docker-action/tree/e43656e248c0bd0647d3f5c195d116aacf6fcaf4)
por SHA `e43656e248c0bd0647d3f5c195d116aacf6fcaf4` (tag v4 consultado).
Compose 2.40.3 Linux se verifica con SHA-256
`dba9d98e1ba5bfe11d88c99b9bd32fc4a0624a30fafe68eea34d61a3e42fd372` de la
[publicación oficial](https://github.com/docker/compose/releases/tag/v2.40.3).
Se mantiene actionlint 1.7.12; su binario Linux amd64 queda fijado por la suma
`8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8`.
Las otras Actions conservan sus SHA. CI remota pendiente del push humano;
la configuración inspeccionada no se presenta como ejecución de un runner Linux.

Resultados exactos, fallos corregidos y límites en
[validación 002](../../especificaciones/002-identidad-acceso/validacion.md).
