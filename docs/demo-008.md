# Demo de Gestión de Solicitudes

La demo permite probar el recorrido de una solicitud con datos ficticios. Abra
`/demo`, reserve un espacio y elija un rol. Cada reserva ocupa una base separada.
El cupo inicial es de tres visitantes y el plazo habitual es de 60 minutos.
Cuando no haya espacio libre, la presentación muestra capacidad ocupada.

No introduzca datos personales ni información real. Los datos de negocio del
espacio se reciclan como conjunto después de su liberación o caducidad. El
historial operativo del laboratorio se conserva por separado.

## Solicitante

1. Entre como solicitante y cree un borrador con un asunto.
2. Elija un proveedor del catálogo y un supervisor; añada conceptos e importes.
3. Guarde y revise el total calculado por el servidor.
4. Presente la solicitud. El estado deja de ser borrador y queda pendiente de decisión.

## Supervisor

1. Vuelva a Demo y entre como supervisor.
2. Abra una solicitud presentada que tenga asignada.
3. Revise conceptos, total y datos del proveedor.
4. Apruebe o rechace; el rechazo requiere un motivo. La decisión queda registrada.

## Auditor

1. Vuelva a Demo y entre como auditor.
2. Consulte el historial y filtre los eventos del espacio.
3. Abra el recurso relacionado para revisar su información.
4. Consulte el resumen de actividad. Este rol no modifica datos.

El cambio de rol usa autenticación real y revoca la sesión anterior de ese
espacio. No existe un botón público de administrador. Los proveedores están
preparados por el operador.

## Caducidad, pestañas y operaciones pendientes

La pantalla muestra la hora de caducidad. Liberar el espacio o alcanzar ese
plazo invalida sus credenciales para nuevas operaciones. Una pestaña antigua
no adopta automáticamente una reserva nueva. Vuelva a Demo para reservar.

Una operación ya admitida termina o revierte en su base original antes del
reciclaje. Si se pierde una respuesta, consulte el resultado de la operación;
no cree otra intención sin conocer el resultado anterior.

## Alcance comprobado

El estado exacto de cada criterio, incidencias y pruebas se publica en el
[informe AG-016](trazabilidad/AG-016-informe.md). La ejecución local no acredita
publicación en Internet ni aceptación humana. Consulte también el
[manual de operación](operacion-demo-008.md).
