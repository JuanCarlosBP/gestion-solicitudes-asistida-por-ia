package es.gestionsolicitudes.solicitudes.dominio;

import es.gestionsolicitudes.identidad.dominio.Rol;
import java.util.Set;
import java.util.UUID;

public record ActorSolicitud(UUID id, Set<Rol> roles) {
    public ActorSolicitud {
        roles = Set.copyOf(roles);
    }

    public boolean global() {
        return roles.contains(Rol.AUDITOR) || roles.contains(Rol.ADMINISTRADOR);
    }

    public boolean solicitante() {
        return roles.contains(Rol.SOLICITANTE);
    }

    public boolean supervisor() {
        return roles.contains(Rol.SUPERVISOR);
    }

    public void exigirCreacion() {
        if (!solicitante()) throw new ErrorSolicitud(ErrorSolicitud.Codigo.ACCESO_NO_PERMITIDO);
    }

    public boolean visible(Solicitud solicitud) {
        return global()
                || (solicitante() && id.equals(solicitud.autor().id()))
                || (supervisor()
                        && id.equals(solicitud.supervisorId())
                        && Set.of("PRESENTADA", "APROBADA", "RECHAZADA")
                                .contains(solicitud.estado()));
    }

    public void exigirPropiedad(Solicitud solicitud) {
        if (!visible(solicitud))
            throw new ErrorSolicitud(ErrorSolicitud.Codigo.SOLICITUD_NO_ENCONTRADA);
        if (!solicitante() || !id.equals(solicitud.autor().id()))
            throw new ErrorSolicitud(ErrorSolicitud.Codigo.ACCESO_NO_PERMITIDO);
    }

    public void exigirDecision(Solicitud solicitud) {
        if (!visible(solicitud))
            throw new ErrorSolicitud(ErrorSolicitud.Codigo.SOLICITUD_NO_ENCONTRADA);
        if (!supervisor()
                || !id.equals(solicitud.supervisorId())
                || id.equals(solicitud.autor().id()))
            throw new ErrorSolicitud(ErrorSolicitud.Codigo.ACCESO_NO_PERMITIDO);
    }
}
