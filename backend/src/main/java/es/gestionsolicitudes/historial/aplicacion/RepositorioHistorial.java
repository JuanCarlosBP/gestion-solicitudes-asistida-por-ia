package es.gestionsolicitudes.historial.aplicacion;

import es.gestionsolicitudes.historial.dominio.*;
import es.gestionsolicitudes.solicitudes.dominio.ActorSolicitud;
import java.util.UUID;

public interface RepositorioHistorial {
    void insertar(CambioHistorial cambio);

    boolean solicitudVisible(ActorSolicitud actor, UUID id);

    boolean existeProveedor(UUID id);

    PaginaHistorial listar(ConsultaHistorial consulta, boolean global);

    ResumenAplicacion resumir(ActorSolicitud actor);
}
