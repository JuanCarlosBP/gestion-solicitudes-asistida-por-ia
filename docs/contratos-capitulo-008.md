# Referencias para completar el capítulo008 privado

Este índice ofrece contratos y rutas estables. No contiene la guía privada
exhaustiva de estudio ni constituye ese manual.

- [Especificación008](../especificaciones/008-demo-operacion-entrega/especificacion.md),
  [plan](../especificaciones/008-demo-operacion-entrega/plan.md) y
  [tareas](../especificaciones/008-demo-operacion-entrega/tareas.md).
- [ADR0009](decisiones/ADR-0009-demo-aislada-y-operacion.md): bases separadas,
  contexto previo a JDBC y provisión externa.
- Backend: `backend/src/main/java/es/gestionsolicitudes/demo/`.
  Contratos HTTP en `http/ControladorDemo.java`; ciclo en
  `aplicacion/ServicioDemo.java`; control y pools en `persistencia/`.
- Control operativo: `backend/src/main/resources/db/demo/V1__control_demo.sql`.
  Es una historia Flyway independiente de las migraciones V1–V7 de negocio.
- Frontend: `frontend/src/app/demo/`; ámbito idempotente en
  `frontend/src/app/operaciones/`; sesión real en `frontend/src/app/identidad/`.
- Infraestructura: `infraestructura/demo/`. QA y carga: `qa/ag016/`.
  Evidencia propia: `qa/evidencias/ag016/`.
- [Guía de uso](demo-008.md), [operación](operacion-demo-008.md) e
  [informe](trazabilidad/AG-016-informe.md) como fuentes de comportamiento observado.

Reserva: cookie opaca HttpOnly más selector público
`espacio:generacion:reservaId`. El selector no concede acceso por sí solo.
JWT incluye el ámbito y el backend lo coteja antes de consultar la sesión.
Los endpoints de bootstrap son públicos; los de reserva propia y acceso por rol
exigen contexto válido. Ningún nombre de base recibido del cliente se usa
como destino JDBC.

Las operaciones de negocio conservan los contratos anteriores. La demo añade
ámbito de reserva y caducidad. El cambio de rol revoca la sesión demo anterior;
el comportamiento de sesiones fuera del perfil demo se mantiene.
