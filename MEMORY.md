# MEMORY.md — Gestión de Solicitudes

Estado: AG-014 finalizada localmente; HA-01–10 verificados, sin aceptación humana.
007 implementado;008 únicamente especificación borrador, sin código ni despliegue.

## Decisiones vigentes

- AG-014 aprueba D-007-01–10; SDD007 y ADR0008 concretan el alcance.
- V7 registra siete cambios de proveedor/solicitud en la misma transacción.
- APROBADA/RECHAZADA se proyectan solo desde decisiones_solicitud V5.
- Sin backfill/purga/plazo jurídico inventado; aviso de historia anterior.
- App SELECT/INSERT; administrador BD puede alterar. Sin garantía criptográfica.
- Proyección mínima sin datos privados, textosV5, secretos ni claves idempotentes.
- Roles actuales/unión multirrol; supervisor no ve borradores ajenos.
- Global/proveedor solo auditor/admin;404 recurso oculto/inexistente.
- GET historial/recurso/global y resumen; page0,size20max100,offset<=100000.
- V1–V6, contratos001–006 y evidencias AG003–013 conservados.

## Ejecución y resultados

- Primer reloj2026-10-15T20:09:15+02:00 tras lecturas iniciales.
- Cierre parcial20:42:08; reanudación humana21:43:51, misma ventana.
- Cierre registrado 2026-10-15T22:20:54.0000000+02:00; duración total observada 02:11:39.
- Límite conservador2026-10-16T04:05:00+02:00, Europe/Madrid.
- Rama feature/007-historial-auditoria confirmada leyendo .git/HEAD.
- Desviación: git status --short inicial antes de leer prohibición; salida vacía.
  Ningún Git posterior ni escriturasGit. Git/aceptación son humanos.
- Docker reparado por usuario; motor29.1.3/Compose2.40.3 PASS.
- Copia ficticiaV6→V7 PASS; siete tablas/checksums y original V6 intactos.
- Backend247PASS:122 unitarias/125IT,0omitidas; SpotlessPASS/SpotBugs0.
- Angular479PASS; tipos/lint/formato/buildPASS; E2E05 33PASS/retries0.
- API007147 +regresión492 PASS. OpenAPI3.1.0/21rutas comprobado.
- npm audit oficial autorizado:producción/completo0avisos. OSV132Maven/653npm0.
-12capturas360/768/1440,42contrastes mínimo5,53:1; teclado/foco3pxPASS.
- Composefinal conserva9huellas;503real2001ms/200+navegadorPASS.
-30contenedoresdetenidos/17volúmenes/20imágenes; todos los previos conservados.
- Defectos de filtros/restablecer/CSS-CSP/contraste corregidos; fallos retenidos.
- Revisión independiente sin hallazgos abiertos; lectura por instrucciones,
  no aislamiento técnico.1454archivos protegidos intactos y CSV conservado.

## Entrega y siguiente paso

- Informe: docs/trazabilidad/AG-014-informe.md; validación007 y ADR0008.
- Evidencia final: qa/evidencias/ag014/reanudacion/cierre-final/.
- Puerta00822:17:38+02 con347,351min restantes; solo borrador documental.
-008 requiere clarificación/aprobación; candidatas de alojamiento no verificadas.
- CI007 remota pendiente push humano. Sin aceptación/integración/despliegue.
- Revisar entrega/manifiestos, decidir Git y aceptación; aclarar008.
- Reinicio de QA conservada documentado en docs/documentaciondev/entorno.md.
