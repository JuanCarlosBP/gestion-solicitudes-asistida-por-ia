package es.gestionsolicitudes.historial.dominio;

import es.gestionsolicitudes.solicitudes.dominio.ConsultaSolicitudes;
import es.gestionsolicitudes.solicitudes.dominio.ErrorSolicitud;
import java.time.Instant;
import java.util.UUID;

public record ConsultaHistorial(
        int pagina,
        int tamano,
        AccionHistorial accion,
        UUID actor,
        Instant desde,
        Instant hasta,
        TipoRecurso tipoRecurso,
        UUID recursoId) {
    public ConsultaHistorial {
        ConsultaSolicitudes.paginacion(pagina, tamano);
        if (desde != null && hasta != null && desde.isAfter(hasta)) throw ErrorSolicitud.invalida();
    }

    public ConsultaHistorial recurso(TipoRecurso tipo, UUID id) {
        return new ConsultaHistorial(pagina, tamano, accion, actor, desde, hasta, tipo, id);
    }
}
