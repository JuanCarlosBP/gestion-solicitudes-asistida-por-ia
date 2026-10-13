# Modelo técnico de identidad

**Estado:** Migración V2 implementada en AG-010; resultados en
[validación 002](../../especificaciones/002-identidad-acceso/validacion.md).

Esquema PostgreSQL `gestion`. V1 permanece intacta; V2 añade exclusivamente
identidad y sesiones. `flyway_schema_history` conserva la historia de migraciones
y no está disponible para `gestion_app`. No hay tablas funcionales de proveedores,
solicitudes, conceptos, importes, aprobaciones ni historial de negocio.

## Tablas

| Tabla | Clave y contenido | Restricciones principales |
|---|---|---|
| `usuarios` | UUID, correo, nombre visible, hash Argon2id, habilitación, intentos/ventana/bloqueo, fechas y versión | Correo único, normalizado; hash con prefijo Argon2id; contador y fechas coherentes. |
| `roles` | Nombre de rol | Solo SOLICITANTE, SUPERVISOR, AUDITOR y ADMINISTRADOR. |
| `usuarios_roles` | PK compuesta usuario/rol y dos FKs | Admite varios roles sin duplicar asignación. |
| `sesiones_acceso` | UUID, usuario, familia UUID única, token actual, creación/expiración/revocación y motivo | Familia por sesión, FK usuario y FK diferida del token actual a esa misma sesión. |
| `tokens_refresco` | UUID público, sesión/familia, hash SHA-256 del secreto, estado, fechas, reemplazo y motivo | Hash de 32 bytes, estados ACTIVO/USADO/REVOCADO, FKs y coherencia de uso/revocación. |

Las fechas de persistencia son `timestamptz`; el servicio utiliza Instant/Clock.
El hash Argon2 incluye parámetros y sal; no permite recuperar la contraseña.
SHA-256 se usa únicamente para el secreto refresh aleatorio de 256 bits.
No se guarda el refresh completo ni JWT de acceso.

Hay índices por rol, usuario de sesión y sesión/familia de tokens, además de
los índices de claves primarias y restricciones únicas. La versión del usuario
permite detectar una actualización incompatible del contador; las operaciones
de sesión se serializan mediante bloqueo de fila dentro de transacciones.

## Ciclo transaccional

Login correcto crea sesión y primer token en la misma transacción.
Un fallo actualiza intentos de la cuenta sin crear credenciales. La familia tiene
una expiración absoluta de ocho horas por defecto y no se extiende al renovar.
Rotar crea el reemplazo, marca usado el anterior y cambia token_actual.
La FK diferida permite crear el par sesión/token de forma atómica.

Reutilización revoca familia y sesión con motivo `REUTILIZACION`; el error 401
se genera después de confirmar la revocación. Cierre usa `CIERRE`.
Deshabilitación y caducidad tienen motivos técnicos definidos. Los tokens usados
se conservan para reconocer reutilización; no se borra su rastro al rotar.
No se incorpora una política automática de purga sin autorización de retención.

## Permisos

`gestion_migracion` aplica Flyway y conserva propiedad del esquema.
`gestion_app` recibe SELECT de roles; SELECT/INSERT/UPDATE de usuarios, sesiones y
tokens; SELECT/INSERT de usuarios_roles. No recibe DELETE, DDL, creación de roles
ni lectura del historial de Flyway. Son privilegios de persistencia técnica,
no una autorización de negocio concedida al navegador.

El proceso backend conoce ambas credenciales porque migra al iniciar. Separar
roles no equivale a ejecutar migraciones en un proceso aislado.
PostgreSQL real/Testcontainers comprueba restricciones, mínimo privilegio,
base nueva, persistencia, segundo arranque, rollback y concurrencia.
No se sustituye por una base de datos en memoria.
