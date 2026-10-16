# MEMORY.md — Gestión de Solicitudes

Estado: CORRECCIÓN LOCAL VERIFICADA — PENDIENTE DE PUBLICACIÓN Y CI (AG-015).
007 pendiente de publicación, nueva CI y aceptación humana; no integrado.

## Decisiones vigentes

- AG-014 aprobó D-007-01–10; historial implementado conforme SDD007/ADR0008.
- V7 registra siete cambios; decisiones provienen de V5, sin backfill inventado.
- Proyección mínima, permisos vigentes y404 oculto/inexistente; sin datos privados.
- AG-015 autoriza solo corregir regresión de la primera CI007, sin ampliar contratos.
-008: tercera opción aprobada conceptualmente: VPS, Java y PostgreSQL únicos,
  bases temporales separadas. Prototipo/dimensionamiento DESPUÉS del cierre007.
- No hubo implementación008, cambios de dependencias ni despliegue.

## AG-015: causa y resultados

- Run38814632990/job116696095705:32/33 E2E; esperado200/409, observado200/403.
- Remoto636API=492+144; documentación/secretos/actionlint/sintaxis OMITIDOS.
- Causa local confirmada: cada Bearer rotaba XSRF, desincronizando pestañas.
- Corregido con estrategia CSRF acotada y rotación explícita login/logout.
- CSRF estricto, permisos, sid/JWT y refresh conservados; frontend/E2E sin cambios.
- Regresión causal antes200/403, después200/409+SOLICITUD_NO_DECIDIBLE.
- Diez enfocadas originales consecutivas PASS/retries0, diez datos aislados.
- Windows33/33 PASS; Linux complementario24/24, excluido operaciones.spec.ts.
- Backend249PASS (122unitarias+127IT), SpotlessPASS/SpotBugs0;133clases imagen=verify.
- Angular479PASS, tipos/lint/formato/buildPASS; API636PASS, Compose503/200PASS.
- API sintética no repite V6→V7 ni aserción condicional de decisión anterior.
- Históricos AG003–014 y V1–V7 se preservan; su evidencia no se reescribe.
- Primer verify falló por dos slices sin bean; import real corregido, aserciones iguales.
- Primer E2E completo31/33 falló por proyecto Compose no heredado.
- Incidente: reinició backend previo001, que salió1 sin conectar a PostgreSQL
  detenido. Afectó ciclo de vida/logs; no afirmar recurso intacto. Informado al usuario.
- Lanzador corregido valida nombre/etiquetas/3contenedores;33 casos repetidos PASS.
- Socket Docker para Linux rechazado por auto-review; alternativa24E2E sin socket.
-52contenedores detenidos/32volúmenes/26imágenes, ningún recurso previo ausente.
- Desviación inicial: git status --short antes de leer prohibición; salida vacía.
  Ningún Git posterior ni escrituras Git/remotas; incidente declarado.

## Entrega y siguiente paso

- Inicio observado2026-10-16T00:39:46.4409128+02:00; sin pausas humanas.
- Fin/corte documental2026-10-16T01:08:09.1353237+02:00; luego sellado de entrega.
- Informe: docs/trazabilidad/AG-015-informe.md; evidencia: qa/evidencias/ag015/.
- Revisión independiente sin hallazgos materiales abiertos de producto/seguridad.
- Revisar manifiesto, integridad e incidentes; humano publica y comprueba nueva CI.
- Aceptación007 e integración humanas;008 esperará ese cierre.
