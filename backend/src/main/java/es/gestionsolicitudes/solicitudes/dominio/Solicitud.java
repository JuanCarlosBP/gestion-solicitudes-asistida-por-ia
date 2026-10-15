package es.gestionsolicitudes.solicitudes.dominio;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

public record Solicitud(
        UUID id,
        String numero,
        Persona autor,
        String asunto,
        String descripcion,
        UUID proveedorId,
        Proveedor proveedor,
        UUID supervisorId,
        Persona supervisor,
        String moneda,
        String estado,
        BigDecimal importeTotal,
        long version,
        Instant creadoEn,
        Instant actualizadoEn,
        Instant presentadoEn,
        List<Concepto> conceptos,
        DecisionSolicitud decision) {
    public record Persona(UUID id, String nombreVisible) {}

    public record Proveedor(
            UUID id,
            String tipo,
            String denominacion,
            String paisFiscal,
            String identificadorFiscal,
            Boolean activo) {}

    public Solicitud {
        conceptos = List.copyOf(conceptos);
    }

    public void exigirEditable(long esperada) {
        if (!estado.equals("BORRADOR"))
            throw new ErrorSolicitud(ErrorSolicitud.Codigo.SOLICITUD_NO_EDITABLE);
        if (esperada != version) throw new ErrorSolicitud(ErrorSolicitud.Codigo.VERSION_OBSOLETA);
    }

    public void exigirDecidible(long esperada) {
        if (!estado.equals("PRESENTADA"))
            throw new ErrorSolicitud(ErrorSolicitud.Codigo.SOLICITUD_NO_DECIDIBLE);
        if (esperada != version) throw new ErrorSolicitud(ErrorSolicitud.Codigo.VERSION_OBSOLETA);
    }

    public Instant decididoEn() {
        return decision == null ? null : decision.decididoEn();
    }

    public Solicitud para(ActorSolicitud actor) {
        if (!actor.visible(this))
            throw new ErrorSolicitud(ErrorSolicitud.Codigo.SOLICITUD_NO_ENCONTRADA);
        if (proveedor != null && Boolean.FALSE.equals(proveedor.activo()) && !actor.global())
            return new Solicitud(
                    id,
                    numero,
                    autor,
                    asunto,
                    descripcion,
                    proveedorId,
                    null,
                    supervisorId,
                    supervisor,
                    moneda,
                    estado,
                    importeTotal,
                    version,
                    creadoEn,
                    actualizadoEn,
                    presentadoEn,
                    conceptos,
                    decision);
        return this;
    }
}
