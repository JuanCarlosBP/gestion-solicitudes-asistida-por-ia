# AG-015 — Plan de diagnóstico previo a corrección

Estado: ejecución autorizada por el encargo humano AG-015; causa no confirmada.
Primer reloj observado: 2026-10-16T00:39:46.4409128+02:00, Europe/Madrid.
Sesión principal: coordinador e implementador único de todos los archivos.
Planificador independiente: planificacion_ag015, solo lectura por instrucciones;
sandbox recibido workspace-write, sin aislamiento técnico de lectura demostrado.
Revisión independiente posterior. Máximo tres agentes simultáneos.

Rama y revisión coinciden por lectura de HEAD/ref. No marcadores de operación
Git en curso. Desviación: git status --short inicial antes de leer la prohibición,
salida vacía; no se ejecutarán más comandos Git. Entrada: 2573 huellas SHA-256 y
copia privada para comparación. V1–V7 e históricos AG003–014 protegidos.

Hipótesis H1: respuestas Bearer concurrentes rotan XSRF entre lectura de Angular y
envío. Confirmar con desigualdad cookie/cabecera real y emisor CsrfFilter; refutar
si ambas son iguales y emite otro control. H2: renovación solapada; comparar orden
y estado, sin suavizar rotación estricta de refresh. H3: identidad/rol/asignación;
comparar igualdad y permisos vigentes. H4: fixture; solo corregirlo si se demuestra
preparación incorrecta. Un fallo aislado o suites verdes no demuestran ninguna.

Crear proyecto gestion-solicitudes-ag015, puerto 18081, BD nueva ficticia. Ejecutar
orden workflow: Compose, sesiones, proveedores, solicitudes, aprobaciones,
concurrencia, historial y sus usuarios de navegador. COMPOSE_PROJECT_NAME explícito
y etiquetas comprobadas antes de verificadores que reinician servicios.

Prueba original enfocada y observador privado sin interceptar/modificar peticiones;
evidencia pública solo presencia/igualdad/orden/códigos. Registrar causa y alcance
antes de editar fuentes. Mantener dos pestañas mismo contexto, carrera real,
[200,409], SOLICITUD_NO_DECIDIBLE, decisión única y una versión resultante.

Después: regresión causal, diez enfocadas consecutivas aisladas/retries0, suite
completa, tipos/lint/formato/build; verify/API si cambia producto/integración.
Documentación, búsqueda acotada de secretos, actionlint/sintaxis y Linux si viable.
Conservar todos los resultados y recursos QA detenidos. No afirmar garantía
estadística ni equiparar pruebas locales con CI remota. Máximo dos correcciones
fallidas del mismo hallazgo. No Git, publicación, aceptación ni trabajo 008.
