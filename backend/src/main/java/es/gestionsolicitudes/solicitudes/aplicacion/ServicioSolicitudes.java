package es.gestionsolicitudes.solicitudes.aplicacion;

import es.gestionsolicitudes.operaciones.aplicacion.ServicioOperaciones;
import es.gestionsolicitudes.operaciones.dominio.*;
import es.gestionsolicitudes.solicitudes.dominio.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.sql.SQLException;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.slf4j.*;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.*;
import org.springframework.transaction.support.*;

@Service
public class ServicioSolicitudes {
    private static final Logger EVENTOS = LoggerFactory.getLogger(ServicioSolicitudes.class);
    private final RepositorioSolicitudes repositorio;
    private final Clock reloj;
    private final TransactionTemplate escritura;
    private final TransactionTemplate lectura;
    private final ServicioOperaciones operaciones;

    public ServicioSolicitudes(
            RepositorioSolicitudes repositorio,
            Clock reloj,
            PlatformTransactionManager transacciones,
            ServicioOperaciones operaciones) {
        this.repositorio = repositorio;
        this.reloj = reloj;
        this.operaciones = operaciones;
        escritura = new TransactionTemplate(transacciones);
        lectura = new TransactionTemplate(transacciones);
        lectura.setReadOnly(true);
        lectura.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
    }

    public Solicitud crearIdempotente(
            ActorSolicitud actor, String asunto, UUID clave, UUID peticion) {
        actor.exigirCreacion();
        String limpio = DatosBorrador.texto(asunto, 3, 160);
        return operaciones.ejecutar(
                PeticionOperacion.de(
                        TipoOperacion.CREAR_BORRADOR, actor.id(), clave, null, null, limpio),
                Solicitud.class,
                () -> crear(actor, limpio, peticion));
    }

    public Solicitud crear(ActorSolicitud actor, String asunto, UUID peticion) {
        actor.exigirCreacion();
        String limpio = DatosBorrador.texto(asunto, 3, 160);
        UUID id = UUID.randomUUID();
        try {
            return escritura.execute(
                    tx -> {
                        Instant ahora = ahora();
                        long numero = repositorio.siguienteNumero();
                        String publico =
                                String.format(
                                        Locale.ROOT,
                                        "SOL-%04d-%06d",
                                        ahora.atZone(ZoneId.of("Europe/Madrid")).getYear(),
                                        numero);
                        repositorio.crear(id, publico, actor.id(), limpio, ahora);
                        trasCommit("CREAR_BORRADOR", actor, id, "CORRECTO", peticion, null);
                        return existente(id, false).para(actor);
                    });
        } catch (DataAccessException error) {
            if (error.getMostSpecificCause() instanceof SQLException sql
                    && "2200H".equals(sql.getSQLState()))
                throw new ErrorSolicitud(ErrorSolicitud.Codigo.NUMERACION_AGOTADA);
            throw error;
        }
    }

    public Solicitud consultar(ActorSolicitud actor, UUID id) {
        return lectura.execute(tx -> existente(id, false).para(actor));
    }

    public Pagina<Solicitud> listar(ActorSolicitud actor, ConsultaSolicitudes consulta) {
        if (consulta.autor() != null && !actor.global())
            throw new ErrorSolicitud(ErrorSolicitud.Codigo.ACCESO_NO_PERMITIDO);
        return lectura.execute(
                tx -> {
                    var pagina = repositorio.listar(actor, consulta);
                    return new Pagina<>(
                            pagina.elementos().stream().map(s -> s.para(actor)).toList(),
                            pagina.pagina(),
                            pagina.tamano(),
                            pagina.totalElementos(),
                            pagina.totalPaginas());
                });
    }

    public Solicitud guardar(
            ActorSolicitud actor, UUID id, long version, DatosBorrador datos, UUID peticion) {
        try {
            return escritura.execute(
                    tx -> {
                        var anterior = existente(id, true);
                        actor.exigirPropiedad(anterior);
                        anterior.exigirEditable(version);
                        Set<UUID> propios = new HashSet<>();
                        anterior.conceptos().forEach(c -> propios.add(c.id()));
                        if (!propios.containsAll(datos.idsExistentes()))
                            throw ErrorSolicitud.invalida();
                        if (datos.proveedorId() != null) {
                            var proveedor =
                                    repositorio
                                            .proveedor(datos.proveedorId(), false)
                                            .orElseThrow(ErrorSolicitud::invalida);
                            // Una baja posterior no destruye un borrador ni obliga a cambiar su
                            // referencia al guardar.
                            if (!Boolean.TRUE.equals(proveedor.activo())
                                    && !datos.proveedorId().equals(anterior.proveedorId()))
                                throw new ErrorSolicitud(ErrorSolicitud.Codigo.PROVEEDOR_INACTIVO);
                        }
                        if (datos.supervisorId() != null
                                && (!datos.supervisorId().equals(anterior.supervisorId()))
                                && (datos.supervisorId().equals(actor.id())
                                        || !repositorio.supervisor(datos.supervisorId(), false)))
                            throw new ErrorSolicitud(ErrorSolicitud.Codigo.SUPERVISOR_INVALIDO);
                        repositorio.guardar(id, version, datos, siguiente(anterior));
                        trasCommit("GUARDAR_BORRADOR", actor, id, "CORRECTO", peticion, null);
                        return existente(id, false).para(actor);
                    });
        } catch (ErrorSolicitud error) {
            rechazo("GUARDAR_BORRADOR", actor, id, error, peticion, null);
            throw error;
        }
    }

    public ResultadoPresentacion presentar(
            ActorSolicitud actor, UUID id, long version, UUID clave, UUID peticion) {
        if (clave == null || version < 0) throw ErrorSolicitud.invalida();
        var intento = PeticionOperacion.de(TipoOperacion.PRESENTAR, actor.id(), clave, id, version);
        try {
            return operaciones.ejecutar(
                    intento,
                    ResultadoPresentacion.class,
                    () -> {
                        Solicitud anterior = existente(id, true);
                        actor.exigirPropiedad(anterior);
                        anterior.exigirEditable(version);
                        if (anterior.proveedorId() == null)
                            throw new ErrorSolicitud(ErrorSolicitud.Codigo.PROVEEDOR_INACTIVO);
                        var proveedor =
                                repositorio
                                        .proveedor(anterior.proveedorId(), true)
                                        .filter(p -> Boolean.TRUE.equals(p.activo()))
                                        .orElseThrow(
                                                () ->
                                                        new ErrorSolicitud(
                                                                ErrorSolicitud.Codigo
                                                                        .PROVEEDOR_INACTIVO));
                        if (anterior.supervisorId() == null
                                || anterior.supervisorId().equals(anterior.autor().id())
                                || !repositorio.supervisor(anterior.supervisorId(), true))
                            throw new ErrorSolicitud(ErrorSolicitud.Codigo.SUPERVISOR_INVALIDO);
                        if (anterior.conceptos().isEmpty()
                                || anterior.conceptos().size() > 100
                                || anterior.importeTotal().signum() <= 0)
                            throw ErrorSolicitud.invalida();
                        var recalculados =
                                new DatosBorrador(
                                        anterior.asunto(),
                                        anterior.descripcion(),
                                        anterior.proveedorId(),
                                        anterior.supervisorId(),
                                        anterior.conceptos(),
                                        Set.of());
                        if (recalculados.total().compareTo(anterior.importeTotal()) != 0)
                            throw ErrorSolicitud.invalida();
                        repositorio.presentar(anterior, proveedor, siguiente(anterior));
                        var resultado = ResultadoPresentacion.de(existente(id, false));
                        trasCommit("PRESENTAR", actor, id, "CORRECTO", peticion, clave);
                        return resultado;
                    },
                    () ->
                            trasCommit(
                                    "DUPLICADO_IDEMPOTENTE",
                                    actor,
                                    id,
                                    "CORRECTO",
                                    peticion,
                                    clave));
        } catch (ErrorSolicitud error) {
            rechazo("PRESENTAR", actor, id, error, peticion, clave);
            throw error;
        }
    }

    public Pagina<Solicitud.Persona> supervisores(
            ActorSolicitud actor, String nombre, int pagina, int tamano) {
        ConsultaSolicitudes.paginacion(pagina, tamano);
        String limpio = DatosBorrador.texto(nombre, 0, 128);
        return lectura.execute(tx -> repositorio.supervisores(actor.id(), limpio, pagina, tamano));
    }

    public ResultadoDecision decidir(
            ActorSolicitud actor,
            UUID id,
            long version,
            UUID clave,
            DatosDecision datos,
            UUID peticion) {
        if (clave == null || version < 0 || datos == null) throw ErrorSolicitud.invalida();
        var intento =
                PeticionOperacion.de(
                        TipoOperacion.valueOf(datos.tipo().name()),
                        actor.id(),
                        clave,
                        id,
                        version,
                        datos.tipo() == DatosDecision.Tipo.APROBAR
                                ? datos.comentario()
                                : datos.motivo());
        try {
            return operaciones.ejecutar(
                    intento,
                    ResultadoDecision.class,
                    () -> {
                        Solicitud anterior = existente(id, true);
                        actor.exigirDecision(anterior);
                        // La autorización vigente también precede al replay, aunque el JWT aún
                        // conserve el rol.
                        var supervisor =
                                repositorio
                                        .supervisorVigente(actor.id())
                                        .orElseThrow(
                                                () ->
                                                        new ErrorSolicitud(
                                                                ErrorSolicitud.Codigo
                                                                        .ACCESO_NO_PERMITIDO));
                        anterior.exigirDecidible(version);
                        Instant ahora = siguiente(anterior);
                        repositorio.decidir(anterior, datos, supervisor, ahora, peticion);
                        var resultado =
                                new ResultadoDecision(
                                        id,
                                        anterior.numero(),
                                        datos.estadoResultante(),
                                        anterior.version() + 1,
                                        ahora,
                                        ahora);
                        trasCommit(datos.tipo().name(), actor, id, "CORRECTO", peticion, clave);
                        return resultado;
                    },
                    () ->
                            trasCommit(
                                    "DUPLICADO_IDEMPOTENTE",
                                    actor,
                                    id,
                                    "CORRECTO",
                                    peticion,
                                    clave));
        } catch (ErrorSolicitud error) {
            rechazo(datos.tipo().name(), actor, id, error, peticion, clave);
            throw error;
        }
    }

    private Solicitud existente(UUID id, boolean bloquear) {
        return repositorio
                .buscar(id, bloquear, true)
                .orElseThrow(
                        () -> new ErrorSolicitud(ErrorSolicitud.Codigo.SOLICITUD_NO_ENCONTRADA));
    }

    private Instant ahora() {
        return reloj.instant().truncatedTo(ChronoUnit.MICROS);
    }

    private Instant siguiente(Solicitud anterior) {
        Instant instante = ahora();
        return instante.isAfter(anterior.actualizadoEn())
                ? instante
                : anterior.actualizadoEn().plusNanos(1000);
    }

    private static void trasCommit(
            String accion,
            ActorSolicitud actor,
            UUID id,
            String resultado,
            UUID peticion,
            UUID clave) {
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        evento(accion, actor, id, resultado, peticion, clave);
                    }
                });
    }

    public static void rechazo(
            String accion,
            ActorSolicitud actor,
            UUID id,
            ErrorSolicitud error,
            UUID peticion,
            UUID clave) {
        evento(accion, actor, id, error.codigo().name(), peticion, clave);
    }

    private static void evento(
            String accion,
            ActorSolicitud actor,
            UUID id,
            String resultado,
            UUID peticion,
            UUID clave) {
        EVENTOS.info(
                "accion={} usuario={} solicitud={} resultado={} peticion={} clave_hash={}",
                accion,
                actor.id(),
                id,
                resultado,
                peticion,
                clave == null ? "-" : hash(clave.toString()));
    }

    private static String hash(String valor) {
        try {
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-256")
                                    .digest(valor.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 no disponible", error);
        }
    }
}
