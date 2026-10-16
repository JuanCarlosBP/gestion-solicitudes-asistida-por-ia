# AG-015 — Causa comprobada y alcance previo a edición

Observado el 2026-10-16, antes de editar fuentes de producto.
La intercalación `antes-intercalada-una` reproduce [200,403] con dos pestañas del
mismo contexto, botones reales y backend/PostgreSQL reales. La cabecera de un POST
se construye antes de un GET real de historial de la otra pestaña; ambos envíos
se liberan juntos, sin modificar cuerpos, cabeceras, cookies ni respuestas.
La instrumentación usa eventos, sin pausas temporales ni reintentos. La prueba
original permanece intacta. No se afirma conocer el timing exacto del run remoto.

El POST rechazado envía cookie y cabecera XSRF presentes pero distintas; mismo
actor y rol SUPERVISOR. Renovaciones200 terminaron antes de decisiones. El cuerpo
es ACCESO_NO_PERMITIDO. `emisor-csrf.txt` identifica CsrfFilter en la variante de
intercalación con ambas cabeceras antiguas, que produjo [403,403]. La validación
CSRF actúa correctamente; el defecto está en regenerar la cookie por cada Bearer.

Spring Security7.0.7: sessionCreationPolicy activa SessionManagementFilter y su
estrategia CSRF; con contexto stateless cada Bearer se considera autenticación
nueva. Los GET de detalle/historial/recuperación borran y reponen XSRF. Una respuesta
de otra petición cambia la cookie compartida después de que Angular haya leído
la cabecera. La configuración que materializaba el token evita una cookie vacía,
pero no evita esta carrera. Se refutan permisos/estado como emisor de estos403.

Corrección mínima prevista: repositorio CSRF compartido; estrategia CSRF conserva
la cookie al validar JwtAuthenticationToken ya autenticado y delega al mecanismo
estándar para otras autenticaciones. Rotación explícita mediante el repositorio
estándar al iniciar sesión correctamente y al cerrar sesión. No rotar por GET ni
por renovación de la misma sesión. Mantener matcher CSRF en TODOS los mutables,
comparación estricta, atributos, JWT/sid, permisos, refresh y contratos005/006.
No dependencias, migraciones, cambios de fixture original ni código008.

Regresiones antes/después: HTTP con lecturas Bearer concurrentes y cookie estable,
materialización sin cookie, rechazos de cabecera ausente/distinta, fronteras login/
logout; intercalación causal; diez pruebas originales sin reintentos y suite33.
Luego verify/API y controles exigidos. Contador de corrección de producto: ciclo1.

Alternativas descartadas: aceptar403, eximir Bearer de CSRF, reintentar, serializar
decisiones o separar contextos. Sustituir toda la estrategia de sesión sería más
amplio; requireExplicitAuthenticationStrategy es incompatible con la configuración
actual según bytecode. La estrategia no-JWT sola no cubre el controlador propio:
por eso se conserva explícitamente la frontera de login/logout.
