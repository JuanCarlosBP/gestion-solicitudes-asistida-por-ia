package es.gestionsolicitudes.historial.aplicacion;

import es.gestionsolicitudes.historial.dominio.*;
import es.gestionsolicitudes.operaciones.aplicacion.RepositorioOperaciones;
import es.gestionsolicitudes.proveedores.dominio.ErrorProveedor;
import es.gestionsolicitudes.solicitudes.dominio.*;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.*;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class ServicioHistorial {
    private final RepositorioHistorial repositorio;
    private final RepositorioOperaciones identidad;
    private final TransactionTemplate lectura;

    public ServicioHistorial(
            RepositorioHistorial repositorio,
            RepositorioOperaciones identidad,
            PlatformTransactionManager transacciones) {
        this.repositorio = repositorio;
        this.identidad = identidad;
        lectura = new TransactionTemplate(transacciones);
        lectura.setReadOnly(true);
        lectura.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
    }

    public PaginaHistorial solicitud(UUID usuario, UUID id, ConsultaHistorial consulta) {
        return lectura.execute(
                tx -> {
                    if (!repositorio.solicitudVisible(vigente(usuario), id))
                        throw new ErrorSolicitud(ErrorSolicitud.Codigo.SOLICITUD_NO_ENCONTRADA);
                    return repositorio.listar(consulta.recurso(TipoRecurso.SOLICITUD, id), false);
                });
    }

    public PaginaHistorial proveedor(UUID usuario, UUID id, ConsultaHistorial consulta) {
        return lectura.execute(
                tx -> {
                    if (!vigente(usuario).global() || !repositorio.existeProveedor(id))
                        throw new ErrorProveedor(ErrorProveedor.Codigo.PROVEEDOR_NO_ENCONTRADO);
                    return repositorio.listar(consulta.recurso(TipoRecurso.PROVEEDOR, id), false);
                });
    }

    public PaginaHistorial global(UUID usuario, ConsultaHistorial consulta) {
        return lectura.execute(
                tx -> {
                    if (!vigente(usuario).global()) throw denegado();
                    return repositorio.listar(consulta, true);
                });
    }

    public ResumenAplicacion resumen(UUID usuario) {
        return lectura.execute(
                tx -> {
                    var actor = vigente(usuario);
                    if (actor.roles().isEmpty()) throw denegado();
                    return repositorio.resumir(actor);
                });
    }

    private ActorSolicitud vigente(UUID usuario) {
        return new ActorSolicitud(usuario, identidad.roles(usuario, false));
    }

    private static ErrorSolicitud denegado() {
        return new ErrorSolicitud(ErrorSolicitud.Codigo.ACCESO_NO_PERMITIDO);
    }
}
