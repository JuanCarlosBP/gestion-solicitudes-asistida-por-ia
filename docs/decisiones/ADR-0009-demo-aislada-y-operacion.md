# ADR-0009 — Demo por reserva y generación, operación separada

**Estado: decisión técnica propuesta dentro de la ejecución autorizada AG-016;
contraste independiente previo a implementar.**

## Contexto

008 exige un único Java de aplicación y PostgreSQL, datos exclusivos por visitante,
cupo pequeño y reciclaje seguro. La arquitectura001–007 consulta sesiones incluso
al validar JWT y usa un DataSource común. V1–V7 conceden permisos al rol literal
gestion_app. Roles PostgreSQL son globales; advisory locks son por base.
ServicioOperaciones tiene memoria de concurrencia global por usuario/clave.

## Decisión

Aplicar [plan008](../../especificaciones/008-demo-operacion-entrega/plan.md):
base por espacio, control operativo separado, cookie opaca de reserva más selector
de generación no autoritativo, contexto antes de Bearer y datasource sin fallback.
Claims demo validados antes de sid; cuentas/Argon2/autenticación real y privilegios
actuales, sin administrador público. Preparar cuentas antes de reservar.
HMAC estándar con secreto externo produce contraseña distinta por generación/rol;
solo hashes Argon2 en negocio; no devolver contraseña por API. Botón demo invoca
el mismo caso de uso de login con esas credenciales tras validar reserva/CSRF.

Runtime PostgreSQL distinto por espacio, gestion_app NOLOGIN solo privilegios de
objetos, CONNECT explícito y sin PUBLIC. No editar V1–V7. Migración y provisión
fuera del servidor HTTP; utilidad del mismo artefacto en JVM transitoria por lote,
incluida en presupuesto. No servidor por visitante, nuevos servicios de negocio
ni dependencias adicionales.

Drenar solicitudes admitidas antes de cerrar pool y recrear. Estados persistidos,
CAS, verificación externa de ausencia de reserva/conexiones y destino autorizado;
fallo bloquea. Operaciones admitidas antes de caducidad pueden terminar en generación
antigua, nunca migran a la siguiente. Control/eventos operativos se conservan;
datos de demo expiran como base completa. Asincronía no hereda contexto.

Memoria/idempotencia navegador se particionan por espacio/generación/reserva;
mantener advisory locks SQL porque la base ya define su ámbito. Verificar con
PostgreSQL real. Perfil público mismo origen/TLS preparado; localhost verificable
sin DNS/proveedor. Medición por conjunto con margen SO/Docker explícito.

## Alternativas y consecuencias

Demo compartida y Java por visitante excluidos por encargo. Alojamiento distribuido
Cloudflare/Render/Neon queda como antecedente del borrador, no decisión abierta.
El backend puede conectarse a los destinos configurados, por lo que aislamiento
también depende del filtro/contexto; separar bases no demuestra por sí solo seguridad.
HMAC externo es secreto sensible: comprometerlo permite derivar contraseñas ficticias;
debe protegerse y no rotar sin invalidar generaciones dependientes.
Un token de reserva robado permite usar ese espacio hasta revocación/caducidad:
HttpOnly/HTTPS/SameSite/CSRF, límites, no logs y expiración reducen exposición.

No se atribuye capacidad VPS real a Docker Desktop. Retención operativa/RPO/RTO,
dominio/precio/licencia/contratación/publicación siguen siendo decisiones humanas.
