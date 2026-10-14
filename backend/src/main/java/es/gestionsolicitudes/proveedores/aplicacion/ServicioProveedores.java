package es.gestionsolicitudes.proveedores.aplicacion;

import es.gestionsolicitudes.proveedores.dominio.*;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class ServicioProveedores {
    private static final Logger EVENTOS = LoggerFactory.getLogger(ServicioProveedores.class);
    private final RepositorioProveedores repositorio;
    private final Clock reloj;
    private final TransactionTemplate escritura;
    private final TransactionTemplate lectura;

    public ServicioProveedores(
            RepositorioProveedores repositorio,
            Clock reloj,
            PlatformTransactionManager transacciones) {
        this.repositorio = repositorio;
        this.reloj = reloj;
        escritura = new TransactionTemplate(transacciones);
        lectura = new TransactionTemplate(transacciones);
        lectura.setReadOnly(true);
        lectura.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
    }

    public Proveedor crear(ActorProveedor actor, DatosProveedor datos) {
        actor.exigirEscritura();
        UUID id = UUID.randomUUID();
        try {
            return escritura.execute(
                    estado -> {
                        Instant ahora =
                                reloj.instant().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
                        Proveedor proveedor = new Proveedor(id, datos, true, 0, ahora, ahora);
                        repositorio.insertar(proveedor);
                        trasCommit("CREAR", actor, id);
                        return proveedor;
                    });
        } catch (DuplicateKeyException error) {
            evento("CREAR", actor, id, "PROVEEDOR_DUPLICADO");
            throw new ErrorProveedor(ErrorProveedor.Codigo.PROVEEDOR_DUPLICADO);
        }
    }

    public Proveedor consultar(ActorProveedor actor, UUID id) {
        actor.exigirLectura();
        return lectura.execute(
                estado -> {
                    Proveedor proveedor = existente(id, false);
                    if (!proveedor.activo() && !actor.puedeVerInactivos()) throw noEncontrado();
                    return proveedor;
                });
    }

    public PaginaProveedores listar(ActorProveedor actor, ConsultaProveedores consulta) {
        actor.exigirLectura();
        if (!Boolean.TRUE.equals(consulta.activo())) actor.exigirInactivos();
        return lectura.execute(estado -> repositorio.listar(consulta));
    }

    public Proveedor modificar(ActorProveedor actor, UUID id, long version, DatosProveedor datos) {
        actor.exigirEscritura();
        try {
            return escritura.execute(
                    estado -> {
                        Proveedor anterior = existente(id, false);
                        anterior.exigirVersion(version);
                        Proveedor cambiado =
                                repositorio
                                        .modificar(id, version, datos, siguienteInstante(anterior))
                                        .orElseThrow(
                                                () ->
                                                        new ErrorProveedor(
                                                                ErrorProveedor.Codigo
                                                                        .VERSION_OBSOLETA));
                        trasCommit("MODIFICAR", actor, id);
                        return cambiado;
                    });
        } catch (DuplicateKeyException error) {
            evento("MODIFICAR", actor, id, "PROVEEDOR_DUPLICADO");
            throw new ErrorProveedor(ErrorProveedor.Codigo.PROVEEDOR_DUPLICADO);
        } catch (ErrorProveedor error) {
            registrarConflicto("MODIFICAR", actor, id, error);
            throw error;
        }
    }

    public Proveedor cambiarEstado(ActorProveedor actor, UUID id, long version, boolean activo) {
        actor.exigirEscritura();
        String accion = activo ? "REACTIVAR" : "DESACTIVAR";
        try {
            return escritura.execute(
                    estado -> {
                        // El bloqueo hace atómica también la decisión de no modificar un estado
                        // repetido.
                        Proveedor anterior = existente(id, true);
                        anterior.exigirVersion(version);
                        if (anterior.activo() == activo) return anterior;
                        Proveedor cambiado =
                                repositorio
                                        .cambiarEstado(
                                                id, version, activo, siguienteInstante(anterior))
                                        .orElseThrow(
                                                () ->
                                                        new ErrorProveedor(
                                                                ErrorProveedor.Codigo
                                                                        .VERSION_OBSOLETA));
                        trasCommit(accion, actor, id);
                        return cambiado;
                    });
        } catch (ErrorProveedor error) {
            registrarConflicto(accion, actor, id, error);
            throw error;
        }
    }

    private Instant siguienteInstante(Proveedor anterior) {
        Instant ahora = reloj.instant().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        // PostgreSQL conserva microsegundos; incluso un Clock fijo debe incrementar la fecha.
        return ahora.isAfter(anterior.actualizadoEn())
                ? ahora
                : anterior.actualizadoEn().plusNanos(1000);
    }

    private Proveedor existente(UUID id, boolean bloquear) {
        return repositorio.buscar(id, bloquear).orElseThrow(ServicioProveedores::noEncontrado);
    }

    private static ErrorProveedor noEncontrado() {
        return new ErrorProveedor(ErrorProveedor.Codigo.PROVEEDOR_NO_ENCONTRADO);
    }

    private static void registrarConflicto(
            String accion, ActorProveedor actor, UUID id, ErrorProveedor error) {
        if (error.codigo() == ErrorProveedor.Codigo.VERSION_OBSOLETA)
            evento(accion, actor, id, "VERSION_OBSOLETA");
    }

    private static void trasCommit(String accion, ActorProveedor actor, UUID id) {
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        evento(accion, actor, id, "CORRECTO");
                    }
                });
    }

    private static void evento(String accion, ActorProveedor actor, UUID id, String resultado) {
        EVENTOS.info(
                "accion={} usuario={} proveedor={} resultado={}",
                accion,
                actor.id(),
                id,
                resultado);
    }
}
