package es.gestionsolicitudes.operaciones.aplicacion;

import es.gestionsolicitudes.operaciones.dominio.*;
import es.gestionsolicitudes.proveedores.dominio.ErrorProveedor;
import es.gestionsolicitudes.solicitudes.aplicacion.RepositorioSolicitudes;
import es.gestionsolicitudes.solicitudes.dominio.*;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class AutorizacionOperaciones {
    private final RepositorioOperaciones operaciones;
    private final RepositorioSolicitudes solicitudes;

    public AutorizacionOperaciones(
            RepositorioOperaciones operaciones, RepositorioSolicitudes solicitudes) {
        this.operaciones = operaciones;
        this.solicitudes = solicitudes;
    }

    public void exigir(UUID usuario, TipoOperacion tipo, UUID recurso, boolean bloquear) {
        var roles = operaciones.roles(usuario, bloquear);
        if (!roles.contains(tipo.rol()))
            throw new ErrorOperacion(ErrorOperacion.Codigo.ACCESO_NO_PERMITIDO);
        if (recurso == null && tipo.alta()) return;
        if (tipo.proveedor()) {
            if (!operaciones.existeProveedor(recurso))
                throw new ErrorProveedor(ErrorProveedor.Codigo.PROVEEDOR_NO_ENCONTRADO);
        } else {
            var solicitud =
                    solicitudes
                            .buscar(recurso, false, false)
                            .orElseThrow(
                                    () ->
                                            new ErrorSolicitud(
                                                    ErrorSolicitud.Codigo.SOLICITUD_NO_ENCONTRADA));
            var actor = new ActorSolicitud(usuario, roles);
            if (tipo == TipoOperacion.APROBAR || tipo == TipoOperacion.RECHAZAR)
                actor.exigirDecision(solicitud);
            else actor.exigirPropiedad(solicitud);
        }
    }

    public void exigirConsulta(UUID usuario, TipoOperacion tipo, UUID recurso) {
        try {
            exigir(usuario, tipo, recurso, false);
        } catch (ErrorOperacion | ErrorProveedor | ErrorSolicitud error) {
            throw new ErrorOperacion(ErrorOperacion.Codigo.OPERACION_NO_ENCONTRADA);
        }
    }
}
