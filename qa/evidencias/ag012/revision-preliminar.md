# Revisión independiente preliminar AG-012

Revisor personalizado distinto del coordinador/implementadores. Solo lectura por
instrucción, sin aislamiento técnico acreditado, sin Git/builds/pruebas/escritura.
Fuentes: adjunto, SDD004/ADR0005, políticas/seguridad, E2E003/evidencias y QA/CI nuevos.

- Contrato y SDD coherentes con D004, sin hallazgos funcionales preliminares.
- Corrección heredada mantiene aserciones, UUID y espera de restauración; captura
  inicial confirma filtros vacíos, enfocada1/1 y regresión9/9 PASS sin reintentos.
- R004-QA01: selector de verificador esperaba demo entre primeros100; acumulación
  de usuarios QA podía desplazarlo. Coordinador corrigió consulta por nombre
  conocido y nombres ficticios UUID únicos. Prueba integrada pendiente.
- CI conserva eventoPR/SHA/evidencias aisladas. Huellas finales y relación con
  imágenes/pruebas quedan pendientes hasta terminar implementación.

No declara004 verificada ni aceptada. Revisión definitiva posterior obligatoria.

## Segunda lectura: backend estático

Servicio/Repositorio/V4 leídos con huellas estables durante revisión. Sin otros
defectos funcionales confirmados en SCI01–11/13: cálculo, permisos, SQL, lectura
consistente, reemplazo, advisory lock usuario/clave, replay exacto y referencias.
Función SECURITY DEFINER acotada y eventos mínimos después de commit.

- R004-DB01: CHECK PRESENTADA admitía tipoNULL por UNKNOWN. Implementador añade
  IS NOT NULL y pruebaSQL negativa. Compose había aplicado V4 candidata previa:
  coordinador ajusta únicamente constraint, Flyway.repair oficial deV4 y validate.
  PASS: huellas de datos iguales y checksumsV1–V3 preservados; sin borrar filas.
  Log ajuste-v4-local.log y utilidad sin credenciales ajuste-v4-utilidad.txt.
- R004-QA02: filtro del nombre demo hacía vacuo el negativo deshabilitado.
  Coordinador consulta nombre único del propio deshabilitado y exige total0.
  Ejecución integrada actualizada pendiente; la inicial119PASS no cubre este refuerzo.

Rollback forzado/carreras/privilegios/migración y evidencia definitiva permanecen
pendientes de revisión hasta recibir resultados completos del implementador.

## Tercera lectura: frontend estático

- R004-UI01, medio SCI04/12: agregar usa longitud+1, duplicando posición con
  posiciones válidas no consecutivas, por ejemplo1/3. Remitido al implementador
  para preservar IDs/orden y garantizar posición única; pruebas pendientes.
- R004-UI02, medio SCI12: Enter en búsqueda de referencia dentro del formulario
  dispara guardado implícito. Remitido al implementador para buscar con teclado,
  evitar submit y probar ambos selectores sin PUT; pruebas pendientes.
- Resto de lectura: rutas/guards, unión de permisos, cálculo BigInt HALF_UP,
  estimación separada, contratos, conservación409, clave ante503, bloqueo tras
  POST200/GETfallido, selectores acotados y estados/foco/reduced-motion coherentes.

El coordinador confirma API final119PASS tras los refuerzos QA01/QA02, y
backend verifyfinal02 PASS144/Spotless/SpotBugs. La revisión visual y las fuentes
frontend corregidas aún necesitan una nueva lectura independiente.

## Cierre parcial con evidencias finales004

El revisor comprueba25/25 huellas backend,36/36 frontend y15 XML JUnit que
coinciden caso por caso con144 pruebas, sin fallos/errores/omitidas. Confirma
rollback real, nueve carreras sincronizadas PostgreSQL, permisos y controles.
R004-DB01, QA01 y QA02 cerrados por fuente y evidencia real. Auditorías Maven132
y npm0 leídas. Imágenes runtime coinciden con manifestlist de ambos builds.

E2E primer intento:8PASS/3FAIL. Swagger esperaba10 rutas anteriores en vez de14;
dos pruebas API conservaban CSRF anterior a la rotación. Primera corrección de
cada defecto de prueba: catálogo cerrado de14 rutas, aserciones nuevas de contrato
y cookie CSRF vigente en cada escritura, manteniendo Bearer/clave/resultado.
Segundo intento11/11 PASS sin reintentos automáticos. R004-UI01/UI02 cerrados con
prueba real de posiciones1/3 y Enter en ambos selectores sin PUT ni navegación.

Capturas finales lista/detalle360/768/1440, conflicto1440 y error360 inspeccionadas
por revisor: legibles, importes/estados correctos, sin desbordamiento detectado.
La barra sticky plantea una reserva de teclado que el coordinador reproduce:

- R004-UI03, medio SCI12: Tab enfoca controles detrás de la barra a768/1440.
  `foco-barra004-inicial.json` registra rectángulos y elementFromPoint del centro;
  por ejemplo control848–892px y barra756–892px, centro oculto. Primera corrección
  remitida al escritor; pendiente nueva evidencia y regresión.

Integridad revisada:496 huellas de entrada y63 logs contrastados con manifiestos
AG011 protegidos, cero diferencias; prefijo CSV36924 bytes idéntico. Los logs
ignorados por rg no se atribuyen como creados ni se inventa su captura de entrada.
No se declara004 íntegramente verificada hasta resolverUI03 y cerrar documentos.

## Evidencia correctiva UI03

Primera corrección: FocoVisible mide barra sticky y mantiene el control por encima
con margen16px, sin animación; ignora barra estática móvil y controles propios.
Unitarias275 PASS y38 huellas frontend comprobadas por revisor. El mismo script
independiente de Tab pasa62/62,0 centros ocultos; E2E final11/11 PASS, con control
equivalente incluido. Build limpio, imágenes runtime y última salud Compose
documentados en `imagenes004-final.json` y `salud004-ui03-final/`.
Se conserva este registro cronológico y se emite conclusión final separada.
