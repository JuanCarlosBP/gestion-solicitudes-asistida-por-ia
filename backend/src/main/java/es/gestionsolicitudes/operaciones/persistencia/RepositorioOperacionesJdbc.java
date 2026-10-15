package es.gestionsolicitudes.operaciones.persistencia;

import es.gestionsolicitudes.identidad.dominio.Rol;
import es.gestionsolicitudes.operaciones.aplicacion.RepositorioOperaciones;
import es.gestionsolicitudes.operaciones.dominio.*;
import es.gestionsolicitudes.proveedores.dominio.Proveedor;
import es.gestionsolicitudes.solicitudes.dominio.*;
import java.math.BigDecimal;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import javax.sql.DataSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.json.JsonMapper;

@Repository
public class RepositorioOperacionesJdbc implements RepositorioOperaciones {
    private final JdbcTemplate jdbc;
    private final JsonMapper json = JsonMapper.builder().build();

    public RepositorioOperacionesJdbc(DataSource fuente) {
        jdbc = new JdbcTemplate(fuente);
    }

    @Override
    public boolean existeProveedor(UUID id) {
        return Boolean.TRUE.equals(
                jdbc.queryForObject(
                        "SELECT EXISTS (SELECT 1 FROM gestion.proveedores WHERE id=?)",
                        Boolean.class,
                        id));
    }

    @Override
    public boolean intentarBloqueo(UUID usuario, UUID clave) {
        return Boolean.TRUE.equals(
                jdbc.queryForObject(
                        "SELECT pg_try_advisory_xact_lock(?)",
                        Boolean.class,
                        HuellaOperacion.bloqueo(usuario, clave)));
    }

    @Override
    public Set<Rol> roles(UUID usuario, boolean bloquear) {
        String sql =
                bloquear
                        ? "SELECT rol FROM gestion.roles_para_operacion(?)"
                        : "SELECT r.rol FROM gestion.usuarios u JOIN gestion.usuarios_roles r ON r.usuario_id=u.id WHERE u.id=? AND u.habilitado";
        return Set.copyOf(jdbc.query(sql, (r, n) -> Rol.valueOf(r.getString(1)), usuario));
    }

    @Override
    public Optional<Confirmada> buscar(UUID usuario, UUID clave) {
        return jdbc
                .query(
                        "SELECT * FROM gestion.operaciones_idempotentes_solicitud WHERE usuario_id=? AND clave=?",
                        (r, n) -> leer(r),
                        usuario,
                        clave)
                .stream()
                .findFirst();
    }

    private Confirmada leer(ResultSet r) throws SQLException {
        TipoOperacion tipo = TipoOperacion.valueOf(r.getString("operacion"));
        UUID id = r.getObject("recurso_id", UUID.class);
        String numero = r.getString("resultado_numero"), estado = r.getString("resultado_estado");
        long version = r.getLong("resultado_version");
        Instant actualizado = r.getTimestamp("resultado_actualizado_en").toInstant();
        Object resultado =
                switch (tipo) {
                    case CREAR_PROVEEDOR, DESACTIVAR_PROVEEDOR, REACTIVAR_PROVEEDOR ->
                            json.readValue(r.getString("resultado_json"), Proveedor.class);
                    case CREAR_BORRADOR ->
                            json.readValue(r.getString("resultado_json"), BorradorPersistido.class)
                                    .solicitud();
                    case PRESENTAR ->
                            new ResultadoPresentacion(
                                    id,
                                    numero,
                                    estado,
                                    version,
                                    actualizado,
                                    r.getTimestamp("resultado_presentado_en").toInstant(),
                                    r.getString("resultado_moneda"),
                                    r.getBigDecimal("resultado_total").toPlainString());
                    case APROBAR, RECHAZAR ->
                            new ResultadoDecision(
                                    id,
                                    numero,
                                    estado,
                                    version,
                                    actualizado,
                                    r.getTimestamp("resultado_decidido_en").toInstant());
                };
        return new Confirmada(
                tipo,
                id,
                r.getString("huella"),
                r.getInt("version_huella"),
                new EstadoOperacion.Resultado(r.getInt("estado_http"), id, version, estado, numero),
                resultado);
    }

    /** Variables originales del alta; las constantes y ausencias del borrador se reconstruyen. */
    public record BorradorPersistido(
            UUID id, String numero, Solicitud.Persona autor, String asunto, Instant creadoEn) {
        static BorradorPersistido de(Solicitud s) {
            return new BorradorPersistido(s.id(), s.numero(), s.autor(), s.asunto(), s.creadoEn());
        }

        Solicitud solicitud() {
            return new Solicitud(
                    id,
                    numero,
                    autor,
                    asunto,
                    null,
                    null,
                    null,
                    null,
                    null,
                    "EUR",
                    "BORRADOR",
                    new BigDecimal("0.00"),
                    0,
                    creadoEn,
                    creadoEn,
                    null,
                    List.of(),
                    null);
        }
    }

    @Override
    public void guardar(PeticionOperacion p, Object resultado, Instant ahora) {
        if (resultado instanceof Proveedor r) {
            insertarNuevo(
                    p,
                    r.id(),
                    null,
                    r.activo() ? "ACTIVO" : "INACTIVO",
                    r.version(),
                    r.actualizadoEn(),
                    json.writeValueAsString(r),
                    ahora);
        } else if (resultado instanceof Solicitud r) {
            insertarNuevo(
                    p,
                    r.id(),
                    r.numero(),
                    r.estado(),
                    r.version(),
                    r.actualizadoEn(),
                    json.writeValueAsString(BorradorPersistido.de(r)),
                    ahora);
        } else {
            UUID id;
            String numero, estado;
            long version;
            Instant actualizado, decidido;
            if (resultado instanceof ResultadoPresentacion r) {
                id = r.id();
                numero = r.numero();
                estado = r.estado();
                version = r.version();
                actualizado = r.actualizadoEn();
                decidido = null;
            } else if (resultado instanceof ResultadoDecision r) {
                id = r.id();
                numero = r.numero();
                estado = r.estado();
                version = r.version();
                actualizado = r.actualizadoEn();
                decidido = r.decididoEn();
            } else throw new IllegalArgumentException("Resultado no admitido");
            jdbc.update(
                    "INSERT INTO gestion.operaciones_idempotentes_solicitud(usuario_id,clave,solicitud_id,operacion,huella,resultado_numero,resultado_estado,resultado_version,resultado_actualizado_en,resultado_presentado_en,resultado_moneda,resultado_total,creado_en,resultado_decidido_en,recurso_id,version_huella,estado_http) SELECT ?,?,?,?, ?,?,?,?, ?,s.presentado_en,s.moneda,s.total,?,?,?,2,200 FROM gestion.solicitudes s WHERE s.id=?",
                    p.usuario(),
                    p.clave(),
                    id,
                    p.tipo().name(),
                    p.huella(),
                    numero,
                    estado,
                    version,
                    Timestamp.from(actualizado),
                    Timestamp.from(ahora),
                    decidido == null ? null : Timestamp.from(decidido),
                    id,
                    id);
        }
    }

    private void insertarNuevo(
            PeticionOperacion p,
            UUID id,
            String numero,
            String estado,
            long version,
            Instant actualizado,
            String snapshot,
            Instant ahora) {
        jdbc.update(
                "INSERT INTO gestion.operaciones_idempotentes_solicitud(usuario_id,clave,solicitud_id,proveedor_id,recurso_id,operacion,huella,version_huella,estado_http,resultado_numero,resultado_estado,resultado_version,resultado_actualizado_en,resultado_json,creado_en) VALUES (?,?,?,?,?,?,?,2,?,?,?,?,?,?::jsonb,?)",
                p.usuario(),
                p.clave(),
                p.tipo().proveedor() ? null : id,
                p.tipo().proveedor() ? id : null,
                id,
                p.tipo().name(),
                p.huella(),
                p.tipo().estadoHttp(),
                numero,
                estado,
                version,
                Timestamp.from(actualizado),
                snapshot,
                Timestamp.from(ahora));
    }
}
