# AG-015 — Revisión independiente sustantiva

Revisor: revision_ag015, rol revisor separado del implementador principal.
Este registro transcribe el dictamen recibido; lo guarda el único escritor.
Lectura de fuentes/evidencias, sin Git, reparaciones ni ejecución de pruebas.
Sandbox efectivo workspace-write; lectura por instrucciones, no aislamiento técnico.

**Dictamen:** sin hallazgos materiales abiertos de producto o seguridad en el
alcance revisado. Evidencia suficiente para corrección local; no nueva CI remota
ni aceptación humana. El sello definitivo se comprobará después de incorporar
este dictamen, la hora observada y el apéndice CSV.

## Hallazgos resueltos

- Alta, aislamiento QA: el lanzador inicial omitía proyecto Compose y arrancó
  un backend previo. Cambiaron ciclo de vida/logs; PostgreSQL siguió detenido y
  falló la conexión. Las guardas finales comprueban proyecto y tres contenedores;
  windows-completa02 acredita de nuevo33 casos. No se afirma inmutabilidad del previo.
- Rotación login/logout: el primer ciclo perdía Set-Cookie XSRF; agregar ambas
  cookies en la misma respuesta corrige el defecto. Dos regresiones HTTP PASS.
- Baja, precisión documental: Linux24, excluido operaciones.spec.ts completo
  (nueve casos, tres dependientes de Docker), con cobertura Windows33 explícita.

## Evidencia contrastada

- IA-10, CI-05, AM-06/07: CSRF estricto incluso mutables Bearer; estabilidad en
  lecturas/renovación y rotación en login/logout.
- AP-05/08, AM-11/12/13: E2E original idéntico a entrada; dos pestañas,200/409,
  SOLICITUD_NO_DECIDIBLE, estado y versión. Diez consecutivas y causal posterior PASS.
-249backend,479Angular,636API,33E2E Windows y24Linux; fallos previos conservados.
-124fuentes backend coinciden con verify;133clases locales recalculadas y
  coincidentes con el registro de comparación de la imagen probada.
-636/639 y reutilización histórica V6→V7 documentadas; controles documentales
  y búsqueda acotada de secretos sin incidencias registradas.
-2211archivos protegidos intactos y recursos presentes/detenidos, con la excepción
  de inmutabilidad del backend previo expresamente indicada.

El manifiesto provisional leído tenía541 rutas únicas. Una edición del informe
durante la revisión dejó su huella provisional desactualizada, detectada por el
revisor; ese sello provisional no es la entrega. Se regenerará y se pedirá
confirmación exacta del paquete final, sin modificar fuentes de producto.

No acredita cobertura integral OWASP, ausencia estadística de carreras, auditoría
completa del volumen previo, aceptación007 o aprobación de publicación.
