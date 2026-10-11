# MEMORY.md — Gestión de Solicitudes

Memoria breve del estado real del proyecto entre sesiones.
No sustituye a Git, las especificaciones ni la documentación histórica.

## Estado actual

- Proyecto: Gestión de Solicitudes.
- `docs/vision-y-alcance.md`: visión y alcance aprobados.
- `docs/constitucion.md`: constitución aprobada.
- `AGENTS.md`: aprobado y vigente.
- `docs/seguridad.md`: política de seguridad aprobada.
- `docs/seguridad/modelo-de-amenazas.md`: modelo de amenazas aprobado.
- `docs/seguridad/cobertura-owasp.md`: cobertura OWASP aprobada.
- `docs/politicas/calidad.md`: política de calidad aprobada.
- `docs/trazabilidad/cambios.md`: conciliación SEG-001 a SEG-028 aprobada, con decisiones y destinos.
- El informe temporal de seguridad fue eliminado antes del primer commit; sus resultados quedan en la documentación permanente.
- Se eliminaron los 28 placeholders prematuros revisados; sus documentos siguen previstos y se crearán en su fase con contenido real.
- No existe todavía una especificación SDD activa ni plan o tareas de implementación aprobados.
- No existen todavía código de aplicación, tests, CI ni despliegue público.
- La aprobación documental no acredita implementación ni pruebas ejecutadas.

## Repositorio local

- Git está inicializado localmente; rama actual: `main`.
- Todavía no existe ningún commit en `main`.
- Todavía no existe repositorio remoto confirmado; no hay remotos configurados localmente.
- `.gitignore`, `.gitattributes` y `.editorconfig` están creados y conservados.

## Decisiones vigentes

- Metodología: SDD spec-anchored con aprobación humana entre fases.
- Arquitectura de referencia: monolito modular; contenido propio en español.
- El usuario decide y aprueba; los agentes proponen, implementan o revisan según su función.
- Git, commits, push, PR y despliegues serán realizados por el usuario para aprenderlos.
- Seguridad, QA, trazabilidad y documentación forman parte del producto.
- La aplicación tendrá CRUD relacionado, permisos, concurrencia, auditoría, OpenAPI/Swagger y rutas Angular.
- La demo final deberá funcionar desde Internet con el equipo local apagado.
- No se introducirán microservicios salvo una decisión posterior expresamente aprobada.

## Siguiente acción

Revisar todos los archivos visibles para Git antes del primer staging.
Esperar autorización; no implementar código ni realizar operaciones Git.
