# Backend AG-013 — evidencia de implementación

Alcance autorizado: T006-03/04/05; exclusivamente backend, temporales y evidencia
backend AG-013. Sin Git, Compose compartido, dependencias nuevas, versiones mayores,
secretos reales ni escritura sobre V1–V5 o evidencias AG-003–AG-012.

Esperado: CI-01–06/08–10 de especificación006 y D-006-01–10 aplicables al servidor.
Observado: servicio transversal, V6 aditiva, siete POST con UUID y GET autorizado;
resultados exitosos atómicos y originales, versión optimista heredada preservada.
No se declara aceptación, integración ni rendimiento productivo.

## Cambios

- Paquete operaciones separa dominio, aplicación, JDBC y HTTP; sustituye
  coordinación/idempotencia local de solicitudes. Los callbacks de negocio
  conservan validaciones, estados, versiones y eventos tras commit.
- V6 amplía la tabla y mantiene PK(usuario,clave), filas y campos originales;
  discrimina huella1 heredada/2 nueva sin recalcular las antiguas. Añade referencia
  transversal, HTTP y snapshot tipado estrictamente necesario para nuevas
  operaciones. Presentación/decisión siguen columnas tipadas existentes.
- Proveedor persiste valores públicos originales; borrador solo id/número/autor/
  asunto/fecha, reconstruyendo constantes. GET proyecta HTTP/id/versión/estado/
  número opcional y nunca devuelve snapshot, fiscal, contacto, texto o hash.
- La autorización lee rol/habilitación actuales y comprueba propiedad/asignación
  antes de efecto/replay; GET oculta operación no visible con404. Una función SQL
  mínima estabiliza roles durante transacciones, sin conceder permisos de edición.
- Coordinación local por titular mínimo y señal sin cuerpos, liberada después
  de commit/rollback. Duplicados locales esperan sin conexión. PostgreSQL advisory
  lock conserva el espacio heredado y garantiza efecto único; intentos fallidos
  liberan conexión antes de esperar. Plazo monotónico3s y409/Retry-After1.
- PostgreSQL inaccesible en validación JWT devuelve503 controlado. CSRF, identidad,
  visibilidad, PUT optimista y no-op de estado con versión vigente permanecen.
- Contrato OpenAPI siete cabeceras UUID,409/Retry-After y recuperación. Se ajustó
  únicamente la firma de una exclusión SpotBugs preexistente para el mismo campo
  repositorio: no se añadió exclusión, ni se cambiaron esfuerzo/umbral.

La canónica y matriz completas pertenecen a especificación006/ADR0007. Registro
sin purga automática; crecimiento O(éxitos con clave nueva), también no-op.

## Comprobaciones y evidencia

`verify-final01` terminó con211/211 PASS:99 unitarias y112 integración PostgreSQL,
cero fallos/errores/omitidas, Spotless PASS y SpotBugs0. Incluye180 anteriores y
31 nuevas006 (9 dominio,6 aplicación,16 integración). Inventario Maven disponible
para auditoría del coordinador. Fecha Europe/Madrid:2026-10-15 12:45:31–12:46:50,
78,57s del runner. Log/argumentos/tiempos en sus archivos log/json.

La comprobación reforzada posterior de replays heredados tras reinicio solo cambia
OperacionesIT. `verify-final02` terminó PASS211/211, Spotless/SpotBugs0 e inventario,
2026-10-15 12:48:29–12:49:57+02,88,67s. Huellas/JUnit vigentes identifican esa última
versión. Los XML y huellas de final01 se conservan con sufijo final01.

| Criterio | Evidencia concreta |
|---|---|
| CI01 | Siete UUID obligatorios/ausentes/invalidos,401/CSRF403 y OpenAPI en OperacionesIT; regresión PUT sin clave. |
| CI02 | Carreras previas de versión proveedor/borrador/decisión;20 claves compitiendo mismo agregado: un200 y19 conflictos. |
| CI03 | OperacionesDominioTest9:UTF8/null/longitud/orden,normalización fiscal/asunto/comentario,contacto significativo,UUID y legado. |
| CI04 |20 HTTP misma clave:20 respuestas201 idénticas,una fila proveedor/resultado. Replay original tras edición,transiciones/no-op y claves incompatibles. |
| CI05 | ServicioOperacionesTest comprueba orden autorización; OperacionesIT revoca ADMINISTRADOR/SOLICITANTE/SUPERVISOR con JWT aún vigente:POST403/GET404. Tercero404/deshabilitado401. |
| CI06 | Trigger falla después del efecto antes de registro:rollback completo y misma clave reintentable; consulta tras respuesta descartada y reinicio recupera original. |
| CI08 | V5→V6 con tres resultados1 sembrados y comparación exacta de todas columnas heredadas/hashes; replays PRESENTAR/APROBAR/RECHAZAR y reinicio. BaseVerificableIT crea V1–V6 nueva. V1–V5 SHA iniciales intactas. |
| CI09 | Advisory externo ocupado:progresoGET,HTTP409/Retry-After1; pool5 ocupado:duplicado espera sin tomar conexión. PG realmente pausado:GET503 desde identidad y recuperación200.20 claves independientes producen20 resultados. |
| CI10 |211 pruebas,Spotless/SpotBugs/inventario; integración Docker/Compose/API/E2E/auditoría/CI y aceptación quedan al coordinador y persona responsable. |

Tiempos observados final01:20 misma143ms;20 distintas64ms;20 mismo agregado72ms;
espera advisoryHTTP3007ms; duplicado con pool ocupado3011ms. El plazo interno es3s;
el tiempo exterior incluye planificación y transporte. No son SLA universales.
Final02:20 misma159ms;20 distintas60ms;20 mismo agregado78ms; espera
advisoryHTTP3008ms y duplicado con pool completo3010ms, conservados en su log.

## Incidencias conservadas

1. `regresion01`:84 unitarias PASS; V6 detectó un paréntesis SQL sobrante antes
   de aplicar. Primera corrección: `migracion02`9 unitarias+3 IT PASS.
2. Ese verify enfocado detectó3 avisos estáticos: captura NPE sustituida por
   validación explícita; autorización dejó de inyectar repositorio proveedor
   completo; exclusión de colaborador preexistente ajustada a nueva firma.
   SpotBugs0 comprobado en operaciones01 y verifies finales.
3. `regresion02`:93 unitarias/95 de96 IT PASS; fixture de navegador CSRF construía
   POST por una segunda función sin UUID. Se añadió clave conservando todas sus
   aserciones; ProveedoresIT15/15 PASS en operaciones01 y regresión final.
4. Revisor detectó SQL CHECK con moneda nullable en rama heredada: exigido IS NOT
   NULL y negativa INSERT para presentación/decisión superada. No cambió dato
   histórico ni migración publicada; V6 seguía siendo candidata local.

Ningún problema acumula dos correcciones fallidas. No se ocultaron fallos con
reintentos ni se omitieron pruebas. `archivos-cambiados.json` identifica29 archivos
backend frente a huellas de entrada; `huellas-fuentes.json` identifica112 fuentes.
`migraciones-protegidas.json` conserva comparación positiva de V1–V5.

## Límites y siguiente paso

EN_PROGRESO es metadato efímero de la instancia actual; despliegue con varias
instancias requiere diseño/prueba adicional para esa consulta. PostgreSQL sigue
siendo autoridad de unicidad/atomicidad y los éxitos sobreviven al reinicio.
Los métodos de efecto heredados permanecen como callbacks internos y fixtures;
los siete endpoints públicos exigen la clave. No hay purga ni retención jurídica
inventada. Completar revisión independiente e integración QA del coordinador;
aceptación, Git, integración y despliegue siguen siendo decisiones humanas.
