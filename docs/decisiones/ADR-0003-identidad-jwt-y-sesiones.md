# ADR-0003 — Identidad, JWT y sesiones

**Estado:** Aprobado
**Origen:** decisión humana AG-010, 2026-10-13.
**Ámbito:** incremento [002](../../especificaciones/002-identidad-acceso/especificacion.md).

## Decisión y motivos

La aplicación emite un JWT de acceso breve (diez minutos) que Angular conserva
solo en memoria y envía como Bearer. Spring Security Resource Server comprueba
firma, algoritmo RS256, emisor, destinatario, fechas y sesión activa en PostgreSQL.
Es autenticación propia para esta aplicación, no un OAuth Authorization Server completo.

El JWT permite un contrato Bearer explícito y validación con componentes mantenidos.
Una firma garantiza integridad; no cifra ni oculta los claims. Por eso contiene
solo identidad UUID, roles y datos técnicos necesarios, sin información sensible.
RS256 separa la clave privada de firma de la pública de validación; no exige
compartir una clave capaz de emitir credenciales con todos los validadores.
Solo se admite ese algoritmo, evitando que el token elija cómo validarse.

No se guarda el acceso en localStorage ni sessionStorage: cualquier script
ejecutado en el origen podría extraerlo y su persistencia alarga la exposición.
La memoria limita la persistencia, aunque un XSS activo todavía puede utilizarla.

Un refresh opaco conserva la sesión al recargar sin alargar el JWT. Contiene
un UUID público y un secreto aleatorio de 256 bits. Se almacena únicamente en
cookie HttpOnly, inaccesible a JavaScript, con SameSite=Strict y ruta limitada.
El servidor conserva SHA-256 del secreto, no su valor recuperable. Al ser aleatorio
y de alta entropía, aquí sí procede un hash rápido; las contraseñas humanas usan
Argon2id, sal aleatoria y coste de memoria/CPU para resistir ataques de diccionario.

PostgreSQL conserva sesión, familia, hash, estados, fechas y reemplazos. Esto
permite revocar inmediatamente un JWT por su sid, caducar la familia a las ocho
horas y detectar reutilización de refresh. La rotación es transaccional. Reutilizar
uno ya usado revoca la familia y la sesión, incluso si otro ya obtuvo un reemplazo.
Cerrar sesión revoca y borra cookie; el siguiente uso del JWT resulta inválido.

HttpOnly reduce extracción del refresh, pero el navegador lo envía automáticamente.
Por ello se mantiene CSRF mediante XSRF-TOKEN/X-XSRF-TOKEN en login, refresh y logout.
SameSite complementa ese control; no lo sustituye. Se usa mismo origen con Nginx,
sin abrir CORS. Secure es obligatorio fuera del HTTP de loopback local.

En local/test se generan claves RSA efímeras de 2048 bits. Un reinicio invalida
JWT previos, pero el refresh persistido puede emitir uno con la nueva clave.
Fuera de local/test se exigen claves externas y el arranque falla si faltan.

## Alternativas rechazadas

| Alternativa | Motivo de descarte en AG-010 |
|---|---|
| Sesión tradicional con cookie | Sería válida, pero la decisión aprobada exige Bearer JWT y contrato explícito de acceso; no se afirma que JWT sea universalmente superior. |
| JWT largo sin refresh | Aumenta la ventana de uso de un token robado y dificulta caducidad corta. |
| Refresh en localStorage | Permite extracción directa por scripts y persistencia fuera del control HttpOnly. |
| JWT sin revocación | Logout no invalidaría acceso hasta expirar y no permitiría respuesta inmediata a reutilización. |
| HMAC compartido | Un validador con la clave también podría firmar; RS256 separa capacidades. |
| Desactivar CSRF | Las cookies se envían automáticamente; dejaría operaciones de sesión sin el control aprobado. |

## Consecuencias y riesgo restante

JWT robado puede usarse hasta caducidad o revocación; un refresh robado sigue
siendo credencial hasta caducidad/revocación y puede provocar denegación de sesión.
XSS puede actuar como el usuario aunque no lea la cookie HttpOnly. No se afirma
protección absoluta ni eliminación de todos los riesgos OWASP.
Consultar sid añade dependencia de PostgreSQL por petición protegida; un fallo
rechaza el acceso de forma segura. La rotación estricta exige evitar renovaciones
simultáneas en Angular; dos pestañas pueden forzar un nuevo login de forma segura.
HTTPS público, gestión operativa de claves y administración de usuarios requieren
incrementos posteriores. La demo se limita a loopback y datos ficticios.

La evidencia de implementación y pruebas reside en
[validación 002](../../especificaciones/002-identidad-acceso/validacion.md).
