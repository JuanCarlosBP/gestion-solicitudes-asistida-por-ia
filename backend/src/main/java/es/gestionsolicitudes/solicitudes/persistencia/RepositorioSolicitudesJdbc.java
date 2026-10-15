package es.gestionsolicitudes.solicitudes.persistencia;

import es.gestionsolicitudes.solicitudes.aplicacion.RepositorioSolicitudes;
import es.gestionsolicitudes.solicitudes.dominio.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import javax.sql.DataSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RepositorioSolicitudesJdbc implements RepositorioSolicitudes {
    private static final String SELECT =
            "SELECT s.*,a.nombre_visible autor_nombre,u.nombre_visible supervisor_nombre,p.tipo p_tipo,p.denominacion p_denominacion,p.pais_fiscal p_pais,p.identificador_fiscal p_fiscal,p.activo p_activo,d.tipo decision_tipo,d.actor_id decision_actor,d.actor_nombre_visible decision_actor_nombre,d.comentario decision_comentario,d.motivo decision_motivo,d.decidido_en FROM gestion.solicitudes s JOIN gestion.usuarios a ON a.id=s.autor_id LEFT JOIN gestion.usuarios u ON u.id=s.supervisor_id LEFT JOIN gestion.proveedores p ON p.id=s.proveedor_id LEFT JOIN gestion.decisiones_solicitud d ON d.solicitud_id=s.id";
    private final JdbcTemplate jdbc;

    public RepositorioSolicitudesJdbc(DataSource fuente) {
        jdbc = new JdbcTemplate(fuente);
    }

    @Override
    public long siguienteNumero() {
        return Objects.requireNonNull(
                jdbc.queryForObject("SELECT nextval('gestion.numero_solicitud_seq')", Long.class));
    }

    @Override
    public void crear(UUID id, String numero, UUID autor, String asunto, Instant ahora) {
        jdbc.update(
                "INSERT INTO gestion.solicitudes(id,numero,autor_id,asunto,moneda,estado,total,version,creado_en,actualizado_en) VALUES (?,?,?,?,'EUR','BORRADOR',0,0,?,?)",
                id,
                numero,
                autor,
                asunto,
                Timestamp.from(ahora),
                Timestamp.from(ahora));
    }

    @Override
    public Optional<Solicitud> buscar(UUID id, boolean bloquear, boolean conceptos) {
        if (bloquear)
            jdbc.query(
                    "SELECT id FROM gestion.solicitudes WHERE id=? FOR UPDATE",
                    (r, n) -> r.getObject(1, UUID.class),
                    id);
        return jdbc.query(SELECT + " WHERE s.id=?", (r, n) -> mapear(r, conceptos), id).stream()
                .findFirst();
    }

    private Solicitud mapear(ResultSet r, boolean incluirConceptos) throws SQLException {
        UUID id = r.getObject("id", UUID.class),
                proveedorId = r.getObject("proveedor_id", UUID.class),
                supervisorId = r.getObject("supervisor_id", UUID.class);
        boolean presentada = !r.getString("estado").equals("BORRADOR");
        Solicitud.Proveedor proveedor =
                proveedorId == null
                        ? null
                        : new Solicitud.Proveedor(
                                proveedorId,
                                r.getString(presentada ? "proveedor_tipo" : "p_tipo"),
                                r.getString(
                                        presentada ? "proveedor_denominacion" : "p_denominacion"),
                                r.getString(presentada ? "proveedor_pais_fiscal" : "p_pais"),
                                r.getString(
                                        presentada ? "proveedor_identificador_fiscal" : "p_fiscal"),
                                presentada ? null : r.getBoolean("p_activo"));
        List<Concepto> conceptos =
                incluirConceptos
                        ? jdbc.query(
                                "SELECT * FROM gestion.conceptos_solicitud WHERE solicitud_id=? ORDER BY posicion ASC",
                                (c, n) ->
                                        new Concepto(
                                                c.getObject("id", UUID.class),
                                                c.getString("descripcion"),
                                                c.getBigDecimal("cantidad"),
                                                Concepto.Unidad.valueOf(c.getString("unidad")),
                                                c.getBigDecimal("precio_unitario"),
                                                c.getBigDecimal("importe_linea"),
                                                c.getInt("posicion")),
                                id)
                        : List.of();
        Timestamp presentado = r.getTimestamp("presentado_en");
        Timestamp decidido = r.getTimestamp("decidido_en");
        DecisionSolicitud decision =
                decidido == null
                        ? null
                        : new DecisionSolicitud(
                                DatosDecision.Tipo.valueOf(r.getString("decision_tipo")),
                                new Solicitud.Persona(
                                        r.getObject("decision_actor", UUID.class),
                                        r.getString("decision_actor_nombre")),
                                r.getString("decision_comentario"),
                                r.getString("decision_motivo"),
                                decidido.toInstant());
        return new Solicitud(
                id,
                r.getString("numero"),
                new Solicitud.Persona(
                        r.getObject("autor_id", UUID.class), r.getString("autor_nombre")),
                r.getString("asunto"),
                r.getString("descripcion"),
                proveedorId,
                proveedor,
                supervisorId,
                supervisorId == null
                        ? null
                        : new Solicitud.Persona(supervisorId, r.getString("supervisor_nombre")),
                r.getString("moneda"),
                r.getString("estado"),
                r.getBigDecimal("total"),
                r.getLong("version"),
                r.getTimestamp("creado_en").toInstant(),
                r.getTimestamp("actualizado_en").toInstant(),
                presentado == null ? null : presentado.toInstant(),
                conceptos,
                decision);
    }

    @Override
    public void guardar(UUID id, long version, DatosBorrador datos, Instant ahora) {
        int actualizadas =
                jdbc.update(
                        "UPDATE gestion.solicitudes SET asunto=?,descripcion=?,proveedor_id=?,supervisor_id=?,total=?,version=version+1,actualizado_en=? WHERE id=? AND version=? AND estado='BORRADOR'",
                        datos.asunto(),
                        datos.descripcion(),
                        datos.proveedorId(),
                        datos.supervisorId(),
                        datos.total(),
                        Timestamp.from(ahora),
                        id,
                        version);
        if (actualizadas != 1) throw new ErrorSolicitud(ErrorSolicitud.Codigo.VERSION_OBSOLETA);
        jdbc.update("DELETE FROM gestion.conceptos_solicitud WHERE solicitud_id=?", id);
        for (Concepto c : datos.conceptos())
            jdbc.update(
                    "INSERT INTO gestion.conceptos_solicitud(id,solicitud_id,descripcion,cantidad,unidad,precio_unitario,importe_linea,posicion) VALUES (?,?,?,?,?,?,?,?)",
                    c.id(),
                    id,
                    c.descripcion(),
                    c.cantidad(),
                    c.unidad().name(),
                    c.precioUnitario(),
                    c.importeLinea(),
                    c.posicion());
    }

    @Override
    public Optional<Solicitud.Proveedor> proveedor(UUID id, boolean bloquear) {
        return jdbc
                .query(
                        "SELECT id,tipo,denominacion,pais_fiscal,identificador_fiscal,activo FROM gestion.proveedores WHERE id=?"
                                + (bloquear ? " FOR SHARE" : ""),
                        (r, n) ->
                                new Solicitud.Proveedor(
                                        r.getObject("id", UUID.class),
                                        r.getString("tipo"),
                                        r.getString("denominacion"),
                                        r.getString("pais_fiscal"),
                                        r.getString("identificador_fiscal"),
                                        r.getBoolean("activo")),
                        id)
                .stream()
                .findFirst();
    }

    @Override
    public boolean supervisor(UUID id, boolean bloquear) {
        String sql =
                bloquear
                        ? "SELECT habilitado FROM gestion.supervisor_para_presentacion(?)"
                        : "SELECT u.habilitado FROM gestion.usuarios u JOIN gestion.usuarios_roles r ON r.usuario_id=u.id WHERE u.id=? AND r.rol='SUPERVISOR'";
        return jdbc.query(sql, (r, n) -> r.getBoolean("habilitado"), id).stream()
                .anyMatch(Boolean.TRUE::equals);
    }

    @Override
    public Optional<Solicitud.Persona> supervisorVigente(UUID id) {
        return jdbc
                .query(
                        "SELECT id,nombre_visible FROM gestion.supervisor_para_presentacion(?) WHERE habilitado",
                        (r, n) ->
                                new Solicitud.Persona(
                                        r.getObject("id", UUID.class),
                                        r.getString("nombre_visible")),
                        id)
                .stream()
                .findFirst();
    }

    @Override
    public Pagina<Solicitud.Persona> supervisores(
            UUID actor, String nombre, int pagina, int tamano) {
        String donde =
                " FROM gestion.usuarios u JOIN gestion.usuarios_roles r ON r.usuario_id=u.id WHERE u.habilitado AND r.rol='SUPERVISOR' AND u.id<>? AND lower(u.nombre_visible) LIKE lower(?) ESCAPE '!'";
        String patron = "%" + escapar(nombre) + "%";
        long total =
                Objects.requireNonNull(
                        jdbc.queryForObject("SELECT count(*)" + donde, Long.class, actor, patron));
        var elementos =
                jdbc.query(
                        "SELECT u.id,u.nombre_visible"
                                + donde
                                + " ORDER BY u.nombre_visible ASC,u.id ASC LIMIT ? OFFSET ?",
                        (r, n) ->
                                new Solicitud.Persona(
                                        r.getObject("id", UUID.class),
                                        r.getString("nombre_visible")),
                        actor,
                        patron,
                        tamano,
                        (long) pagina * tamano);
        return new Pagina<>(elementos, pagina, tamano, total, (total + tamano - 1) / tamano);
    }

    @Override
    public Pagina<Solicitud> listar(ActorSolicitud actor, ConsultaSolicitudes c) {
        List<Object> valores = new ArrayList<>();
        StringBuilder donde = new StringBuilder(" WHERE (");
        if (actor.global()) donde.append("true");
        else {
            donde.append("false");
            if (actor.solicitante()) agregar(donde, valores, " OR s.autor_id=?", actor.id());
            if (actor.supervisor())
                agregar(
                        donde,
                        valores,
                        " OR (s.supervisor_id=? AND s.estado IN ('PRESENTADA','APROBADA','RECHAZADA'))",
                        actor.id());
        }
        donde.append(")");
        if (c.numero() != null) agregar(donde, valores, " AND s.numero=?", c.numero());
        if (c.asunto() != null)
            agregar(
                    donde,
                    valores,
                    " AND lower(s.asunto) LIKE lower(?) ESCAPE '!'",
                    "%" + escapar(c.asunto()) + "%");
        if (c.estado() != null) agregar(donde, valores, " AND s.estado=?", c.estado());
        if (c.proveedor() != null) agregar(donde, valores, " AND s.proveedor_id=?", c.proveedor());
        if (c.autor() != null) agregar(donde, valores, " AND s.autor_id=?", c.autor());
        if (c.supervisor() != null)
            agregar(donde, valores, " AND s.supervisor_id=?", c.supervisor());
        if (c.fechaDesde() != null)
            agregar(
                    donde,
                    valores,
                    " AND s.creado_en>=?",
                    Timestamp.from(c.fechaDesde().atStartOfDay().toInstant(ZoneOffset.UTC)));
        if (c.fechaHasta() != null)
            agregar(
                    donde,
                    valores,
                    " AND s.creado_en<?",
                    Timestamp.from(
                            c.fechaHasta().plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)));
        long total =
                Objects.requireNonNull(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM gestion.solicitudes s" + donde,
                                Long.class,
                                valores.toArray()));
        String orden =
                switch (c.orden()) {
                    case NUMERO -> "s.numero";
                    case CREADO_EN -> "s.creado_en";
                    case ACTUALIZADO_EN -> "s.actualizado_en";
                    case IMPORTE_TOTAL -> "s.total";
                };
        valores.add(c.tamano());
        valores.add((long) c.pagina() * c.tamano());
        var elementos =
                jdbc.query(
                        SELECT
                                + donde
                                + " ORDER BY "
                                + orden
                                + (c.descendente() ? " DESC" : " ASC")
                                + ",s.id ASC LIMIT ? OFFSET ?",
                        (r, n) -> mapear(r, false),
                        valores.toArray());
        return new Pagina<>(
                elementos, c.pagina(), c.tamano(), total, (total + c.tamano() - 1) / c.tamano());
    }

    @Override
    public void presentar(Solicitud s, Solicitud.Proveedor p, Instant ahora) {
        int actualizadas =
                jdbc.update(
                        "UPDATE gestion.solicitudes SET estado='PRESENTADA',version=version+1,actualizado_en=?,presentado_en=?,proveedor_tipo=?,proveedor_denominacion=?,proveedor_pais_fiscal=?,proveedor_identificador_fiscal=? WHERE id=? AND version=? AND estado='BORRADOR'",
                        Timestamp.from(ahora),
                        Timestamp.from(ahora),
                        p.tipo(),
                        p.denominacion(),
                        p.paisFiscal(),
                        p.identificadorFiscal(),
                        s.id(),
                        s.version());
        if (actualizadas != 1) throw new ErrorSolicitud(ErrorSolicitud.Codigo.VERSION_OBSOLETA);
    }

    @Override
    public void decidir(
            Solicitud s,
            DatosDecision datos,
            Solicitud.Persona actor,
            Instant ahora,
            UUID peticion) {
        int actualizadas =
                jdbc.update(
                        "UPDATE gestion.solicitudes SET estado=?,version=version+1,actualizado_en=? WHERE id=? AND version=? AND estado='PRESENTADA'",
                        datos.estadoResultante(),
                        Timestamp.from(ahora),
                        s.id(),
                        s.version());
        if (actualizadas != 1) throw new ErrorSolicitud(ErrorSolicitud.Codigo.VERSION_OBSOLETA);
        jdbc.update(
                "INSERT INTO gestion.decisiones_solicitud(id,solicitud_id,actor_id,actor_nombre_visible,tipo,comentario,motivo,decidido_en,version_anterior,version_resultante,peticion_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                UUID.randomUUID(),
                s.id(),
                actor.id(),
                actor.nombreVisible(),
                datos.tipo().name(),
                datos.comentario(),
                datos.motivo(),
                Timestamp.from(ahora),
                s.version(),
                s.version() + 1,
                peticion);
    }

    private static void agregar(
            StringBuilder donde, List<Object> valores, String sql, Object valor) {
        donde.append(sql);
        valores.add(valor);
    }

    private static String escapar(String valor) {
        return valor.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }
}
