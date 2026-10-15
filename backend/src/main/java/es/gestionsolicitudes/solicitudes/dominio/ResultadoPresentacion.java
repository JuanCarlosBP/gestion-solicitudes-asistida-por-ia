package es.gestionsolicitudes.solicitudes.dominio;

import java.time.Instant;
import java.util.UUID;

public record ResultadoPresentacion(
        UUID id,
        String numero,
        String estado,
        long version,
        Instant actualizadoEn,
        Instant presentadoEn,
        String moneda,
        String importeTotal) {
    public static ResultadoPresentacion de(Solicitud solicitud) {
        return new ResultadoPresentacion(
                solicitud.id(),
                solicitud.numero(),
                solicitud.estado(),
                solicitud.version(),
                solicitud.actualizadoEn(),
                solicitud.presentadoEn(),
                solicitud.moneda(),
                solicitud.importeTotal().toPlainString());
    }
}
