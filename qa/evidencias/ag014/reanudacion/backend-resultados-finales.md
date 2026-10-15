# Resultado backend de la reanudación AG-014

Verificación finalizada el 15 de octubre de2026,21:52:53+02:00.

| Comprobación ejecutada | Resultado observado | Evidencia |
|---|---|---|
| Compilación del soporte de conservación y formato | PASS | backend-conservacion-compilacion-01.log |
| Primera ejecución enfocada | Bloqueo preventivo antes de iniciar PostgreSQL | backend-historial-01.log y resultado JSON |
| Ejecución enfocada tras corregir el soporte | 13IT;0fallos,0errores,0omitidas | backend-historial-02.log y JUnit XML |
| verify completo | 122unitarias+125IT=247;0fallos,0errores,0omitidas | backend-completo-01.log y22XML en backend-completo-01-junit/ |
| Formato y análisis estático del verify | Spotless PASS;SpotBugs0hallazgos y0errores | mismo log y backend-completo-01-spotbugs.xml |
| Conservación de recursos | 11contenedores QA detenidos y11volúmenes presentes; ningún recurso anterior ausente | inventarios antes/después y resultados JSON |

La primera ejecución encontró un problema del helper de QA: el paquete compartido
de GenericContainer se inicializaba desde testcontainers-jdbc, cuyo manifiesto no
declara versión. El control falló antes de crear recursos. Se cambió exclusivamente
la referencia del control a DockerClientFactory, en el paquete único del JAR core
con Implementation-Version2.0.5. Una corrección; siguiente ejecución PASS. El
fallo y sus inventarios quedan conservados, sin atribuirlo al producto.

Los comandos exactos y el entorno están en backend-historial-02-comando.json y
backend-completo-01-comando.json. Se ejecutó backend/verificar-conservando.ps1 con
`-Alcance historial -Intento 02` y después `-Alcance completo -Intento 01`.
Java21,Mockito javaagent y cachés/TEMP/user.home dentro del workspace.
GESTION_QA_CONSERVAR_CONTENEDORES=true,TESTCONTAINERS_REUSE_ENABLE=true y
TESTCONTAINERS_RYUK_DISABLED=false mantuvieron Ryuk sin iniciar y evitaron el hook
de limpieza alternativo. No se ejecutaron Git,remove,prune,reset ni limpieza manual.

El modo opcional usa un UUID distinto por instancia y no comparte datos entre
pruebas. Los once contenedores conservados tienen estado exited y no tienen
org.testcontainers.sessionId; sus volúmenes asociados siguen en el inventario.
Las imágenes y todos los contenedores/volúmenes previos siguen presentes.
Los IDs íntegros están en los JSON de inventario, sin datos de autenticación.

Las13IT verificaron PostgreSQL real: migración V6→V7 con recursos y decisiones
previos,checksums y replay anterior; siete acciones; decisiones solo desdeV5;
rollback por fallo de evento; carreras y replay; no-op; permisos vigentes y
multirrol; filtros y límites inclusivos; paginación estable; privacidad; resumen;
append-only; reinicio y contrato OpenAPI. Las112IT heredadas también pasaron.

Medición local:251eventos,página20,311296bytes de tabla+índices; petición HTTP11ms
en focused y10ms en verify. Es una medición de este entorno, no un SLA.

backend-fuentes-final.csv contiene130huellas. Respecto a las128huellas del cierre
previo, no cambió producción. Se añadieron helper y runner y se modificaron ocho
IT exclusivamente por factory/import. backend-transformacion-helper-01.csv
demuestra8/8coincidencias SHA256 con las fuentes anteriores al invertir únicamente
esa sustitución en memoria. No se modificaron aserciones, migracionesV1–V6, pom,
dependencias ni evidencias anteriores.

Esta evidencia completa la verificación backend solicitada. La validación global,
la aceptación y cualquier integración corresponden al coordinador y a la persona
responsable. No se actualizó documentación compartida desde este rol.
