package es.gestionsolicitudes.solicitudes.http;

import es.gestionsolicitudes.solicitudes.dominio.*;
import java.time.Instant;
import java.util.*;

public record DetalleSolicitud(
        UUID id,
        String numero,
        Solicitud.Persona autor,
        String asunto,
        String descripcion,
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
        List<Linea> conceptos,
        Instant decididoEn,
        DecisionSolicitud decision) {
    public DetalleSolicitud {
        conceptos = List.copyOf(conceptos);
    }

    @io.swagger.v3.oas.annotations.media.Schema(name = "ConceptoSolicitudPublico")
    public record Linea(
            UUID id,
            String descripcion,
            String cantidad,
            Concepto.Unidad unidad,
            String precioUnitario,
            String importeLinea,
            int posicion) {
        static Linea de(Concepto c) {
            return new Linea(
                    c.id(),
                    c.descripcion(),
                    c.cantidad().toPlainString(),
                    c.unidad(),
                    c.precioUnitario().toPlainString(),
                    c.importeLinea().toPlainString(),
                    c.posicion());
        }
    }

    public static DetalleSolicitud de(Solicitud s) {
        return new DetalleSolicitud(
                s.id(),
                s.numero(),
                s.autor(),
                s.asunto(),
                s.descripcion(),
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
                s.conceptos().stream().map(Linea::de).toList(),
                s.decididoEn(),
                s.decision());
    }
}
