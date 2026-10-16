package es.gestionsolicitudes.solicitudes.http;

import es.gestionsolicitudes.solicitudes.dominio.Solicitud;
import java.time.Instant;
import java.util.UUID;

public record ResumenSolicitud(
        UUID id,
        String numero,
        Solicitud.Persona autor,
        String asunto,
        UUID proveedorId,
        Solicitud.Proveedor proveedor,
        UUID supervisorId,
        Solicitud.Persona supervisor,
        String moneda,
        String estado,
        String importeTotal,
        long version,
        Instant creadoEn,
        Instant actualizadoEn,
        Instant presentadoEn,
        Instant decididoEn) {
    public static ResumenSolicitud de(Solicitud s) {
        return new ResumenSolicitud(
                s.id(),
                s.numero(),
                s.autor(),
                s.asunto(),
                s.proveedorId(),
                s.proveedor(),
                s.supervisorId(),
                s.supervisor(),
                s.moneda(),
                s.estado(),
                s.importeTotal().toPlainString(),
                s.version(),
                s.creadoEn(),
                s.actualizadoEn(),
                s.presentadoEn(),
                s.decididoEn());
    }
}
