package es.gestionsolicitudes.historial.persistencia;

import es.gestionsolicitudes.historial.aplicacion.RepositorioHistorial;
import es.gestionsolicitudes.historial.dominio.*;
import es.gestionsolicitudes.solicitudes.dominio.ActorSolicitud;
import java.sql.*;
import java.util.*;
import javax.sql.DataSource;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.stereotype.Repository;

@Repository
public class RepositorioHistorialJdbc implements RepositorioHistorial {
    // Proyección cerrada: nunca selecciona comentario, motivo ni otros datos privados de V5.
    private static final String FUENTES =
            """
            (SELECT 'EVENTO:' || id::text AS id, tipo_recurso, recurso_id, accion,
                    actor_id, actor_nombre_visible, ocurrido_en, version_anterior,
                    version_resultante, estado_anterior, estado_resultante, 'EVENTO_V7' AS origen
             FROM gestion.eventos_historial
             UNION ALL
             SELECT 'DECISION:' || id::text, 'SOLICITUD', solicitud_id,
                    CASE tipo WHEN 'APROBAR' THEN 'APROBADA' ELSE 'RECHAZADA' END,
                    actor_id, actor_nombre_visible, decidido_en, version_anterior,
                    version_resultante, 'PRESENTADA',
                    CASE tipo WHEN 'APROBAR' THEN 'APROBADA' ELSE 'RECHAZADA' END, 'DECISION_V5'
             FROM gestion.decisiones_solicitud) h
            """;
    private static final String VISIBILIDAD =
            """
            (:global OR (:solicitante AND autor_id=:usuario)
             OR (:supervisor AND supervisor_id=:usuario AND estado IN ('PRESENTADA','APROBADA','RECHAZADA')))
            """;
    private final NamedParameterJdbcTemplate jdbc;

    public RepositorioHistorialJdbc(DataSource fuente) {
        jdbc = new NamedParameterJdbcTemplate(fuente);
    }

    @Override
    public void insertar(CambioHistorial c) {
        var p =
                new MapSqlParameterSource()
                        .addValue("id", UUID.randomUUID())
                        .addValue("tipo", c.tipoRecurso().name())
                        .addValue("recurso", c.recursoId())
                        .addValue(
                                "solicitud",
                                c.tipoRecurso() == TipoRecurso.SOLICITUD ? c.recursoId() : null)
                        .addValue(
                                "proveedor",
                                c.tipoRecurso() == TipoRecurso.PROVEEDOR ? c.recursoId() : null)
                        .addValue("accion", c.accion().name())
                        .addValue("actor", c.actorId())
                        .addValue("anterior", c.versionAnterior())
                        .addValue("resultante", c.versionResultante())
                        .addValue("estadoAnterior", c.estadoAnterior())
                        .addValue("estadoResultante", c.estadoResultante())
                        .addValue("fecha", Timestamp.from(c.ocurridoEn()))
                        .addValue("peticion", c.peticionId());
        int insertados =
                jdbc.update(
                        """
                INSERT INTO gestion.eventos_historial
                  (id,tipo_recurso,recurso_id,solicitud_id,proveedor_id,accion,actor_id,actor_nombre_visible,
                   version_anterior,version_resultante,estado_anterior,estado_resultante,ocurrido_en,peticion_id)
                SELECT :id,:tipo,:recurso,:solicitud,:proveedor,:accion,u.id,u.nombre_visible,
                       :anterior,:resultante,:estadoAnterior,:estadoResultante,:fecha,:peticion
                FROM gestion.usuarios u WHERE u.id=:actor
                """,
                        p);
        if (insertados != 1) throw new IllegalStateException("Actor de historial no disponible");
    }

    @Override
    public boolean solicitudVisible(ActorSolicitud actor, UUID id) {
        return Boolean.TRUE.equals(
                jdbc.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM gestion.solicitudes WHERE id=:id AND "
                                + VISIBILIDAD
                                + ")",
                        permisos(actor).addValue("id", id),
                        Boolean.class));
    }

    @Override
    public boolean existeProveedor(UUID id) {
        return Boolean.TRUE.equals(
                jdbc.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM gestion.proveedores WHERE id=:id)",
                        Map.of("id", id),
                        Boolean.class));
    }

    @Override
    public PaginaHistorial listar(ConsultaHistorial c, boolean global) {
        var p = new MapSqlParameterSource();
        var donde = new StringBuilder(" WHERE 1=1");
        filtro(
                donde,
                p,
                "tipo_recurso",
                "tipo",
                c.tipoRecurso() == null ? null : c.tipoRecurso().name());
        filtro(donde, p, "recurso_id", "recurso", c.recursoId());
        filtro(donde, p, "accion", "accion", c.accion() == null ? null : c.accion().name());
        filtro(donde, p, "actor_id", "actor", c.actor());
        if (c.desde() != null) {
            donde.append(" AND ocurrido_en>=:desde");
            // PostgreSQL guarda microsegundos: redondear hacia dentro del intervalo evita
            // incluir eventos fuera de un límite ISO con precisión de nanosegundos.
            var desde = c.desde().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
            if (!desde.equals(c.desde())) desde = desde.plusNanos(1000);
            p.addValue("desde", Timestamp.from(desde));
        }
        if (c.hasta() != null) {
            donde.append(" AND ocurrido_en<=:hasta");
            p.addValue(
                    "hasta",
                    Timestamp.from(c.hasta().truncatedTo(java.time.temporal.ChronoUnit.MICROS)));
        }
        long total =
                Objects.requireNonNull(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM " + FUENTES + donde, p, Long.class));
        p.addValue("limite", c.tamano()).addValue("offset", (long) c.pagina() * c.tamano());
        var elementos =
                jdbc.query(
                        "SELECT * FROM "
                                + FUENTES
                                + donde
                                + " ORDER BY ocurrido_en DESC,id COLLATE \"C\" DESC LIMIT :limite OFFSET :offset",
                        p,
                        (r, n) -> mapear(r));
        boolean anterior =
                global
                        || !Boolean.TRUE.equals(
                                jdbc.queryForObject(
                                        """
                SELECT EXISTS(SELECT 1 FROM gestion.eventos_historial
                  WHERE tipo_recurso=:tipo AND recurso_id=:recurso
                    AND accion IN ('PROVEEDOR_CREADO','BORRADOR_CREADO'))
                """,
                                        new MapSqlParameterSource("tipo", c.tipoRecurso().name())
                                                .addValue("recurso", c.recursoId()),
                                        Boolean.class));
        return new PaginaHistorial(
                elementos,
                c.pagina(),
                c.tamano(),
                total,
                (total + c.tamano() - 1) / c.tamano(),
                anterior);
    }

    private static void filtro(
            StringBuilder donde,
            MapSqlParameterSource p,
            String columna,
            String nombre,
            Object valor) {
        if (valor != null) {
            // Columna y nombre son constantes internas, nunca entradas HTTP.
            donde.append(" AND ").append(columna).append("=:").append(nombre);
            p.addValue(nombre, valor);
        }
    }

    private EventoHistorial mapear(ResultSet r) throws SQLException {
        var accion = AccionHistorial.valueOf(r.getString("accion"));
        return new EventoHistorial(
                r.getString("id"),
                TipoRecurso.valueOf(r.getString("tipo_recurso")),
                r.getObject("recurso_id", UUID.class),
                accion,
                new EventoHistorial.Actor(
                        r.getObject("actor_id", UUID.class), r.getString("actor_nombre_visible")),
                r.getTimestamp("ocurrido_en").toInstant(),
                r.getObject("version_anterior", Long.class),
                r.getLong("version_resultante"),
                r.getString("estado_anterior"),
                r.getString("estado_resultante"),
                accion.resumen(),
                EventoHistorial.Origen.valueOf(r.getString("origen")));
    }

    @Override
    public ResumenAplicacion resumir(ActorSolicitud actor) {
        return jdbc.queryForObject(
                """
                SELECT count(*) FILTER(WHERE estado='BORRADOR') borradores,
                       count(*) FILTER(WHERE estado='PRESENTADA') presentadas,
                       count(*) FILTER(WHERE estado='APROBADA') aprobadas,
                       count(*) FILTER(WHERE estado='RECHAZADA') rechazadas, count(*) total,
                       count(*) FILTER(WHERE :solicitante AND autor_id=:usuario AND estado='BORRADOR') propios,
                       count(*) FILTER(WHERE :supervisor AND supervisor_id=:usuario AND autor_id<>:usuario AND estado='PRESENTADA') asignadas
                FROM gestion.solicitudes WHERE
                """
                        + VISIBILIDAD,
                permisos(actor),
                (r, n) ->
                        new ResumenAplicacion(
                                new ResumenAplicacion.Estados(
                                        r.getLong("borradores"),
                                        r.getLong("presentadas"),
                                        r.getLong("aprobadas"),
                                        r.getLong("rechazadas"),
                                        r.getLong("total")),
                                new ResumenAplicacion.Pendientes(
                                        r.getLong("propios"), r.getLong("asignadas"))));
    }

    private static MapSqlParameterSource permisos(ActorSolicitud actor) {
        return new MapSqlParameterSource("usuario", actor.id())
                .addValue("global", actor.global())
                .addValue("solicitante", actor.solicitante())
                .addValue("supervisor", actor.supervisor());
    }
}
