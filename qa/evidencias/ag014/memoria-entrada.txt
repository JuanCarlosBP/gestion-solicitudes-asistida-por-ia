# MEMORY.md — Gestión de Solicitudes

Memoria vigente AG-013; entrada anterior conservada en qa/evidencias/ag013/memoria-entrada.txt.
Historia AG-003–AG-012, REV-001, ADR-0001–0006 y SDD001–005 intactos.

## Decisiones vigentes

- AG-013 aprueba D-006-01–10, SDD006, ADR0007 e implementación.
- Siete POST exigen UUID; PUT conserva versión sin nueva clave obligatoria.
- Usuario+clave global, SHA-256 canónica2 y lectura legacy1 sin reescribir hashes.
- Efecto/resultado/evento atómicos; identidad, permisos actuales, visibilidad y CSRF.
- Espera interna 3 s; 409 OPERACION_EN_PROGRESO/Retry-After1; rollback reintentable.
- GET recupera mínimo; descriptor cliente de hasta cuatro campos, TTL24h, sin cuerpos.
- Formularios conservan UUID efectiva en memoria tras confirmar; una nueva navegación
  permite otra intención. Conflictos definitivos no se convierten en éxito.
- V6 amplía tabla existente; V1–V5 y replays004/005 conservados. Sin purga automática.
- EN_PROGRESO corresponde a una instancia; réplicas y retención jurídica posteriores.
- Web Locks necesario para iniciar; sin él se permite recuperar y se informa.
- Sin versiones mayores, dependencias nuevas, Redis, colas ni datos reales.

## Resultado local AG-013

- Inicio2026-10-15T12:20:55+02:00; límite22:20:55+02:00 Europe/Madrid.
- Precondición PASS en9,01min; JDK21 instalado corrigió selección inicial JAVA_HOME17.
- Backend211PASS (99unit/112IT), SpotlessPASS, SpotBugs0.
- Angular411PASS; tipos/lint/formato/buildPASS; E2E23PASS, cero reintentos.
- API492PASS: sesiones88/proveedores78/solicitudes119/aprobaciones140/concurrencia67.
- V5→V6 real conserva siete tablas/todascolumnas/checksums; tres replayslegacy trasreinicio.
- Docker sin caché;126clases/recursos/bundles idénticos a salidas locales verificadas.
- Compose final persistencia/503/200/navegadorPASS; tres servicios detenidos y volumen conservado.
- npm0avisos; OSVMaven132componentes/0avisos; dependencias idénticas a entrada.
-1075protegidos sin alteraciones; prefijo CSV histórico conservado.
- CI-01–10 verificados localmente; revisión independiente sin hallazgos abiertos.
- AG-013 cerrada13:27:21+02:00; duración01:06:26; evidencia cierre.json en AG013.
  No aceptación ni integración de006.
- PR3/4 consultadas en lectura: fallo documental heredado reproducido y corregido
  mediante excepción .gitignore al logAG011 existente; CI remota nueva pendiente.
- Desviación: git status --short leído antes de conocer prohibición adjunta;
  salida vacía, sin cambios. No hubo más comandos ni escrituras Git.

## Estado y siguiente paso

- El encargo informa aceptación formal de gobierno/001/002;003–005 verificados localmente.
- Informe docs/trazabilidad/AG-013-informe.md y validación006 contienen resultados/límites.
- Puerta007 cumplida13:23:37+02:00,537,298min restantes tras006 verificada.
-007-historial-auditoria contiene solo especificación borrador; pendiente aclaración
  y aprobación humana. Sin plan, tareas, ADR, migración ni código007.
- Persona responsable revisa, selecciona cambios, hace Git/CI remota y decide aceptación/integración.
- Rama comunicada feature/006-concurrencia-idempotencia, sin verificarla con Git.
