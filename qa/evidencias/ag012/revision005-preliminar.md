# Revisión preliminar005

Revisor personalizado solo lectura, sin reparaciones, Git, builds o pruebas.
Coordinador conserva el registro de sus conclusiones.

SDD/ADR0006 coherentes conD00501–08 y puerta005; ningún hueco de contrato
confirmado. Riesgos planificados: replay004 intacto, autorización vigente antes
del replay, evento/estado/resultado atómicos, bandeja forzada y reintento UI con
petición/clave originales. No son defectos demostrados por sí mismos.

R005-QA01, medio: negativo AJENO esperaba404, pero carece deSUPERVISOR y el filtro
HTTP exige ese rol antes de llegar al recurso. Lo correcto es403; SUPERVISOR ajeno
sí recibe404. Coordinador corrige únicamente esa expectativa, conservando ambos
negativos. Detectado estáticamente antes de ejecutar; prueba real pendiente.

Resto de QA/CI sin defectos confirmados: loopback, UUID propios, CSRF vigente,
restauración de fixture tras revocación, conteo de eventos y evidencias aisladas.
Se refuerza la correlación técnica: exigir una línea de éxito con APROBAR o
RECHAZAR, solicitud concreta, petición y hash64; buscar solo el UUID podía
coincidir con eventos004. Ejecución final pendiente.

R005-UI01: recorte Unicode de Angular con trim omitía NEL y U+001C–1F.
Implementador y revisor lo identificaron; primera corrección comparte normalizador
entre validación, confirmación y petición. Regresión346 y enfocada71 PASS;
revisor contrasta huellas y cierra fuente/unitarias. Navegador final pendiente.

R005-QA02: primera API falla al autenticar SUPERVISOR_AJENO. Un nuevo intento
139PASS y200 ciclos login/cierre sobre el fixture antiguo no bastaban para explicar
el fallo. Backend identifica desajuste de precisión de fechas de fixture.
PostgreSQL registra23514/fechas_usuario a22:25:11.584UTC; el fixture se creó a
22:25:11.035473UTC y el servicio intenta actualizado_en a22:25:11.000UTC.
Evidencias login005-causa-postgresql.log y login005-causa-fecha.log, sin filas
completas ni hashes. Primera corrección solo QA: date_trunc('second',now()) en
los fixtures y aserción previa al login. No se cambian identidad ni restricciones.
Regresión de la corrección pendiente.

R005-API01: E2E detecta que OpenAPI no declara200 para aprobar/rechazar y sus
errores heredan esquema de éxito. Backend corrige anotaciones y amplía IT para
200/400/401/403/404/409/500/503 con sus esquemas. Pruebas finales pendientes.

R005-QA03: dos E2E interrumpen foco de afterNextRender al enfocar H1 antes de
que «Volver a revisar» haya devuelto foco al textarea. Capturas muestran que Tab
ya está en Revisar decisión. Frontend añade espera de foco del textarea antes
del recorrido, conservando controles, confirmación y comprobación geométrica.
No cambia producción. Prueba enfocada y regresión pendientes.

La primera captura posmigración consultó historial antes del commit de Flyway:
V5 todavía ausente, seis tablas conservadas. Tras arranque y salud200, historialV5
y las mismas seis huellas PASS; ambos resultados conservados. El verificador
exige salud200 antes de capturar el estado posterior.
