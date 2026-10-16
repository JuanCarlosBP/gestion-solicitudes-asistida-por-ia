# AG-006 — incidencias y límites

Registro factual; no acredita aceptación. Inicio 2026-10-13 10:16:08 +02:00.

- Docker: tubería denegada por sandbox. Consulta específica escalada correcta,
  Engine 29.1.3. No se modificó Docker Desktop ni permisos globales.
- Red: npm/curl sin DNS en sandbox. Escalaciones específicas a fuentes oficiales.
- Caché npm: primera asignación PowerShell usó un objeto sin propiedad Parent;
  npm continuó y terminó usando caché predeterminada. Se corrigió a ruta absoluta
  del workspace y npm ci se repitió con éxito. No se actualizó npm global.
- Maven Wrapper: argumento PowerShell sin comillas dividió 3.9.16. Una corrección,
  argumentos entre comillas; Wrapper 3.3.4 y Maven 3.9.16 generados correctamente.
- Formato Maven, T006: google-java-format vía Spotless falla con
  InvocationTargetException en los 13 fuentes iniciales. JAVA_HOME heredado
  apuntaba a Java 17 pese a java del PATH 21. Corrección 1: JAVA_HOME 21 solo
  en el proceso; el fallo persistió. Diagnóstico CLI del formatter con Java 21
  requirió exports de jdk.compiler; con ellos el diagnóstico directo pasó.
  Corrección 2: declarar exports en .mvn/jvm.config; Spotless siguió fallando.
  Se detiene este control tras dos correcciones fallidas. Bloqueo de tarea,
  no global. No se suprime la comprobación en el POM ni en la CI final.
  Las pruebas independientes se ejecutan explícitamente con spotless.skip=true;
  sus resultados no acreditan verify completo ni BV-08 completo.
- ESLint 9.39.5: aviso de soporte finalizado; auditorías npm sin vulnerabilidades
  informadas. Advertencia conservada, sin cambio de versión mayor automático.

## Incidencias posteriores y revisión final

- Pruebas Java: Mockito/instrumentación se bloqueó en sandbox; se detuvo el
  proceso de prueba propio. Ejecución con permiso específico y temporales locales:
  10 unitarias/HTTP y 3 integraciones PASS. No se cambió el permiso global.
- WebMvcTest necesitó EnableWebSecurity en la configuración probada; corregido
  una vez y comprobado con los casos 200/503, denegación y cabeceras.
- Vitest: EPERM en temporales y resolución incorrecta dentro del sandbox.
  La ejecución autorizada con temporales locales pasó las 11 pruebas.
- Testcontainers no reconoció inicialmente el digest de la imagen oficial;
  asCompatibleSubstituteFor("postgres") identifica esa misma imagen. Tres IT PASS.
- Wrapper Linux: sin unzip descargaba TAR.GZ y no coincidía con el SHA-256 del
  ZIP fijado. Se instaló unzip exacto solo en la etapa Docker de construcción;
  build PASS sin desactivar integridad.
- SpotBugs señaló dos patrones de recursos/API administrados por Spring;
  exclusiones limitadas a método/patrón, justificadas en spotbugs-exclusiones.xml.
  Comprobación final sin hallazgos restantes; no se suprimió el análisis global.
- Compose 2.40.3 no admite start --wait; se corrigió a start y sondeo HTTP acotado.
  Persistencia y caída/recuperación reales pasaron. No se borraron volúmenes.
- El enlace de salto inicialmente navegaba por base href y reiniciaba la carga;
  corrección del foco y del evento, seguida de 5 E2E PASS, incluido teclado.
- La revisión automática rechazó la consulta OSV API que habría transmitido
  coordenadas del proyecto. La solicitud no se envió. Se descargó la base pública
  completa y se comparó offline, sin subir inventario ni código.
- OSV 2.7.0 utiliza osv-scalibr en la ruta de caché, frente a osv-scanner de la
  documentación consultada. Preparador final y auditor offline comprobados.
- Auditoría Maven inicial: 17 coincidencias; parcheo compatible de Tomcat/Jackson,
  regresión de 13 pruebas, SpotBugs y Compose PASS; auditoría final: cero coincidencias.
- Revisión de solo lectura T008: el script Compose no creaba el directorio TEMP.
  Se devolvió al rol implementador, se añadió New-Item y se repitió la comprobación
  real. Evidencia: compose-qa-revision.txt. Revisión posterior de ese cambio, sin
  nuevas reparaciones ni pretensión de independencia.
- El verify obligatorio final volvió a fallar en Spotless. Fue una comprobación
  de cierre, no una tercera corrección. El bloqueo local de T006 permanece visible.
