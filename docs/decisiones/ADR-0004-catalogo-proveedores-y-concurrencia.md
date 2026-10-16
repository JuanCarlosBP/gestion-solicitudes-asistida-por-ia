# ADR-0004 — Catálogo de proveedores y concurrencia

**Estado:** Aprobado
**Origen:** decisión humana AG-011, 2026-10-14, D-003-01–08.
**Ámbito:** [003](../../especificaciones/003-proveedores/especificacion.md).

## Decisión y motivos

Proveedor es catálogo, no usuario. Admite persona jurídica y profesional.
Baja lógica conserva identidad y referencias futuras. ADMINISTRADOR reactiva;
repetir estado con versión vigente no modifica nuevamente. Sin borrado físico.

Identidad fiscal: país ISO más normalizado NFKC → recorte → Locale.ROOT mayúsculas
→ espacios Unicode colapsados, conservando puntuación. Unique incluye inactivos
para evitar segunda identidad después de baja, incluso con altas concurrentes.
No acredita validez legal universal ni checksum. Validar longitud después de
normalizar, sin truncar expansiones ni eliminar símbolos significativos.

Versión inicial 0. Editar/estado exige versión conocida y SQL por id/version;
solo una escritura simultánea gana, la otra recibe 409 VERSION_OBSOLETA y recarga.
Control local de proveedor; 006 ampliará concurrencia/idempotencia transversal.
SOLICITANTE/SUPERVISOR leen activos; AUDITOR ambos estados; ADMINISTRADOR ambos y
escribe. Unión de permisos explícitos, sin eludir reglas. API autoriza con CSRF;
Angular orienta UX.

Offset page/size para previsión hasta 50.000: 0/20 predeterminado, máximo 100,
orden cerrado/desempate id. Navegación simple; offsets profundos y contiene pueden
costar más. Sin prometer latencias ni medir carga aquí; cursores/índices especializados
se evaluarán con evidencia futura.

## Alternativas rechazadas

| Alternativa | Motivo |
|---|---|
| Borrado físico | Perdería identidad/referencias y no está autorizado. |
| Duplicados inactivos | Permite segunda identidad fiscal y dificulta reactivación. |
| Validación fiscal universal inventada | No hay reglas legales universales aprobadas. |
| Autorización solo Angular | Una llamada REST directa evitaría el control. |
| Última escritura gana | Sobrescribe cambios sin advertencia. |
| Paginación sin límite | Puede agotar recursos y exponer listados innecesarios. |

## Consecuencias y límites

Contacto limitado a correo/teléfono para gestión. Eventos acción/usuario/proveedor/
resultado/petición, sin fiscal/contacto/cuerpos, no son historial funcional 007.
Retención/eliminación jurídica definitiva pendientes. SQL parametrizado,
restricciones y roles sin DELETE/DDL, errores seguros y pruebas obligatorias.
Este ADR no declara implementación, rendimiento, aceptación ni OWASP completo.

La columna de país se implementa como varchar(2) más CHECK de exactamente dos
letras mayúsculas, equivalente al dominio de char(2) propuesto sin su padding.
El índice de activo/país favorece la consulta predeterminada; consultar ambos
estados por país puede recorrer más entradas. No altera permisos ni resultados.
