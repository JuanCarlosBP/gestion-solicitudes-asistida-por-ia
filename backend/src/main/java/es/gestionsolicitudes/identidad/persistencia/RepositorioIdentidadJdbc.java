package es.gestionsolicitudes.identidad.persistencia;

import es.gestionsolicitudes.identidad.aplicacion.RepositorioIdentidad;
import es.gestionsolicitudes.identidad.dominio.*;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import javax.sql.DataSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RepositorioIdentidadJdbc implements RepositorioIdentidad {
    private final JdbcTemplate jdbc;

    public RepositorioIdentidadJdbc(DataSource fuente) {
        this.jdbc = new JdbcTemplate(fuente);
    }

    @Override
    public Optional<Usuario> buscarUsuario(String correo, boolean bloquear) {
        String sql =
                bloquear
                        ? "SELECT * FROM gestion.usuarios WHERE correo = ? FOR UPDATE"
                        : "SELECT * FROM gestion.usuarios WHERE correo = ?";
        return jdbc.query(sql, (fila, numero) -> usuario(fila), correo).stream().findFirst();
    }

    @Override
    public Optional<Usuario> buscarUsuario(UUID id) {
        return jdbc
                .query(
                        "SELECT * FROM gestion.usuarios WHERE id = ?",
                        (fila, numero) -> usuario(fila),
                        id)
                .stream()
                .findFirst();
    }

    private Usuario usuario(ResultSet fila) throws SQLException {
        UUID id = fila.getObject("id", UUID.class);
        Set<Rol> roles =
                new HashSet<>(
                        jdbc.query(
                                "SELECT rol FROM gestion.usuarios_roles WHERE usuario_id = ?",
                                (r, n) -> Rol.valueOf(r.getString(1)),
                                id));
        return new Usuario(
                new UsuarioPublico(
                        id, fila.getString("correo"), fila.getString("nombre_visible"), roles),
                fila.getString("clave_hash"),
                fila.getBoolean("habilitado"),
                new IntentosAcceso(
                        fila.getInt("intentos_fallidos"),
                        instante(fila, "inicio_ventana"),
                        instante(fila, "bloqueado_hasta")));
    }

    @Override
    public void guardarIntentos(UUID id, IntentosAcceso intentos, Instant ahora) {
        jdbc.update(
                "UPDATE gestion.usuarios SET intentos_fallidos = ?, inicio_ventana = ?, bloqueado_hasta = ?, actualizado_en = ?, version = version + 1 WHERE id = ?",
                intentos.fallos(),
                fecha(intentos.inicioVentana()),
                fecha(intentos.bloqueadoHasta()),
                fecha(ahora),
                id);
    }

    @Override
    public void crearUsuario(
            UUID id, String correo, String nombre, String hash, Set<Rol> roles, Instant ahora) {
        jdbc.update(
                "INSERT INTO gestion.usuarios(id, correo, nombre_visible, clave_hash, creado_en, actualizado_en) VALUES (?, ?, ?, ?, ?, ?)",
                id,
                correo,
                nombre,
                hash,
                fecha(ahora),
                fecha(ahora));
        for (Rol rol : roles) {
            jdbc.update(
                    "INSERT INTO gestion.usuarios_roles(usuario_id, rol) VALUES (?, ?)",
                    id,
                    rol.name());
        }
    }

    @Override
    public void crearSesion(SesionAcceso sesion) {
        jdbc.update(
                "INSERT INTO gestion.sesiones_acceso(id, usuario_id, familia_id, token_actual, creado_en, expira_en) VALUES (?, ?, ?, ?, ?, ?)",
                sesion.id(),
                sesion.usuarioId(),
                sesion.familiaId(),
                sesion.tokenActual(),
                fecha(sesion.creadoEn()),
                fecha(sesion.expiraEn()));
    }

    @Override
    public void crearToken(TokenRefresco token) {
        jdbc.update(
                "INSERT INTO gestion.tokens_refresco(id, sesion_id, familia_id, secreto_hash, estado, creado_en, expira_en) VALUES (?, ?, ?, ?, ?, ?, ?)",
                token.id(),
                token.sesionId(),
                token.familiaId(),
                token.secretoHash(),
                token.estado(),
                fecha(token.creadoEn()),
                fecha(token.expiraEn()));
    }

    @Override
    public Optional<TokenRefresco> buscarToken(UUID id) {
        return jdbc
                .query(
                        "SELECT * FROM gestion.tokens_refresco WHERE id = ?",
                        (r, n) ->
                                new TokenRefresco(
                                        r.getObject("id", UUID.class),
                                        r.getObject("sesion_id", UUID.class),
                                        r.getObject("familia_id", UUID.class),
                                        r.getBytes("secreto_hash"),
                                        r.getString("estado"),
                                        instante(r, "creado_en"),
                                        instante(r, "expira_en")),
                        id)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<SesionAcceso> bloquearSesion(UUID id) {
        return jdbc
                .query(
                        "SELECT * FROM gestion.sesiones_acceso WHERE id = ? FOR UPDATE",
                        (r, n) ->
                                new SesionAcceso(
                                        r.getObject("id", UUID.class),
                                        r.getObject("usuario_id", UUID.class),
                                        r.getObject("familia_id", UUID.class),
                                        r.getObject("token_actual", UUID.class),
                                        instante(r, "creado_en"),
                                        instante(r, "expira_en"),
                                        instante(r, "revocado_en")),
                        id)
                .stream()
                .findFirst();
    }

    @Override
    public void rotar(SesionAcceso sesion, UUID anterior, UUID siguiente, Instant ahora) {
        jdbc.update(
                "UPDATE gestion.tokens_refresco SET estado = 'USADO', usado_en = ?, reemplazo_id = ? WHERE id = ?",
                fecha(ahora),
                siguiente,
                anterior);
        jdbc.update(
                "UPDATE gestion.sesiones_acceso SET token_actual = ? WHERE id = ?",
                siguiente,
                sesion.id());
    }

    @Override
    public void revocar(SesionAcceso sesion, Instant ahora, String motivo) {
        jdbc.update(
                "UPDATE gestion.sesiones_acceso SET revocado_en = COALESCE(revocado_en, ?), motivo_revocacion = COALESCE(motivo_revocacion, ?) WHERE id = ?",
                fecha(ahora),
                motivo,
                sesion.id());
        jdbc.update(
                "UPDATE gestion.tokens_refresco SET estado = 'REVOCADO', revocado_en = COALESCE(revocado_en, ?), motivo_revocacion = COALESCE(motivo_revocacion, ?) WHERE familia_id = ?",
                fecha(ahora),
                motivo,
                sesion.familiaId());
    }

    @Override
    public boolean sesionActiva(UUID sesion, UUID usuario, Instant ahora) {
        return Boolean.TRUE.equals(
                jdbc.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM gestion.sesiones_acceso s JOIN gestion.usuarios u ON u.id = s.usuario_id WHERE s.id = ? AND s.usuario_id = ? AND s.revocado_en IS NULL AND s.expira_en > ? AND u.habilitado)",
                        Boolean.class,
                        sesion,
                        usuario,
                        fecha(ahora)));
    }

    @Override
    public void reemplazarSesionDemo(Instant ahora) {
        es.gestionsolicitudes.demo.dominio.ContextoDemo.exigir();
        // Advisory locks PostgreSQL tienen ámbito de base. Serializa los cambios de rol de
        // este visitante; ninguna sesión de otra base participa en este bloqueo o UPDATE.
        jdbc.execute("SELECT pg_advisory_xact_lock(16008002)");
        jdbc.update(
                "UPDATE gestion.sesiones_acceso SET revocado_en=?, motivo_revocacion='CIERRE' WHERE revocado_en IS NULL",
                fecha(ahora));
        jdbc.update(
                "UPDATE gestion.tokens_refresco SET estado='REVOCADO', revocado_en=?, motivo_revocacion='CIERRE' WHERE estado <> 'REVOCADO'",
                fecha(ahora));
    }

    private static Timestamp fecha(Instant instante) {
        return instante == null ? null : Timestamp.from(instante);
    }

    private static Instant instante(ResultSet fila, String columna) throws SQLException {
        Timestamp valor = fila.getTimestamp(columna);
        return valor == null ? null : valor.toInstant();
    }
}
