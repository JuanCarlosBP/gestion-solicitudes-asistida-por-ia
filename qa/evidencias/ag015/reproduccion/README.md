# Reproducción de AG-015

Estas copias son evidencia de scripts ejecutados, no lanzadores que deban
ejecutarse sobre la entrega. Contienen rutas locales y destinos históricos.
Antes de repetir, copiar a un directorio privado, asignar proyecto QA nuevo,
puerto libre y destinos nuevos que no existan; verificar etiquetas Docker.
No ejecutar preparar-final.ps1 directamente: sus redirecciones reemplazarían
evidencias existentes. No borrar/resetear recursos para obtener una base limpia.

- `preparar-final.ps1.txt`: orden Compose/API y usuarios del workflow, entorno
  ficticio .env.example, proyecto gestion-solicitudes-ag015-final y puerto18081.
- `e2e.ps1.txt`: lanzador corregido usado en windows-completa02; exige tres
  contenedores activos del proyecto correcto. Seleccionar -Completa y fixture
  api-final; para una serie nueva, elegir nombre distinto y -Repeticiones10.
  El primer lanzador y sus errores se conservan aparte. No reutilizar su PASS
  de reinicio, que apuntó al backend previo.
- `aprobaciones-intercalada.spec.ts.txt`, `observar.ts.txt` y
  `playwright.config.ts.txt`: fuentes diagnósticas de antes-intercalada-una y
  despues-intercalada. Restituir en tmp/ag015/e2e, tmp/ag015 y tmp/ag015,
  respectivamente, manteniendo importaciones relativas y un destino nuevo.
  La fuente conserva las aserciones originales y solo controla orden de envío.
  El observador puede omitir callbacks tardíos al cerrar páginas; no es una
  traza exhaustiva ni modifica tráfico. Las decisiones causales sí están registradas.
- `Dockerfile.linux.txt` y `linux-runner.mjs.txt`: Linux complementario de24 casos
  con Chromium, Node24.13.0 y los mismos paquetes fijados por package-lock.
  El proxy de QA solo permite al navegador usar loopback, retransmite cuerpos
  y cabeceras reales y no registra credenciales. La imagen se construyó desde
  frontend. Se montó únicamente runner de solo lectura y directorio de evidencia;
  sin socket Docker ni privilegios adicionales. Excluye operaciones.spec.ts
  completo (nueve casos, tres con acceso a Docker); todos pasaron en Windows33.
- `*-bytecode.txt`: javap local de Spring Security7.0.7 para localizar el origen
  de la estrategia de sesión/CSRF. No equivale a una traza del run remoto.

El ejecutor [backend](../../../verificar-backend-ag015.ps1) conserva PostgreSQL
Testcontainers y evidencia por intento. Su parámetro Intento debe ser único.
Cada repetición de QA requiere observar sus resultados y detener los contenedores
creados sin eliminarlos. La entrega AG-015 está detenida; las bases ficticias quedan
retenidas. El incidente del backend previo se explica en el
[informe](../../../../docs/trazabilidad/AG-015-informe.md).
