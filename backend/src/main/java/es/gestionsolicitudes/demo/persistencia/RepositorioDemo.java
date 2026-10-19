package es.gestionsolicitudes.demo.persistencia;

import es.gestionsolicitudes.demo.configuracion.PropiedadesDemo;
import es.gestionsolicitudes.demo.dominio.ContextoDemo;
import es.gestionsolicitudes.demo.dominio.ErrorDemo;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Control independiente; sus transacciones nunca adquieren conexiones de negocio. */
public final class RepositorioDemo {
    public record Espacio(
            String id, UUID generacion, String estado, UUID reserva, Instant expira, long bytes) {
        public ContextoDemo contexto() {
            return new ContextoDemo(reserva, id, generacion, expira);
        }
    }

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaccion;
    private final PropiedadesDemo propiedades;

    public RepositorioDemo(DataSource control, PropiedadesDemo propiedades) {
        jdbc = new JdbcTemplate(control);
        transaccion = new TransactionTemplate(new DataSourceTransactionManager(control));
        this.propiedades = propiedades;
    }

    public List<Espacio> espacios() {
        return jdbc
                .query(
                        "SELECT * FROM demo.espacios ORDER BY id",
                        (r, n) ->
                                new Espacio(
                                        r.getString("id"),
                                        r.getObject("generacion", UUID.class),
                                        r.getString("estado"),
                                        r.getObject("reserva_id", UUID.class),
                                        r.getTimestamp("expira_en") == null
                                                ? null
                                                : r.getTimestamp("expira_en").toInstant(),
                                        r.getLong("bytes")))
                .stream()
                .filter(e -> propiedades.contiene(e.id()))
                .toList();
    }

    public ContextoDemo validar(String hash, String selector, Instant ahora) {
        if (hash == null || selector == null || selector.length() > 140) throw ErrorDemo.invalida();
        var encontrados =
                jdbc.query(
                        "SELECT * FROM demo.espacios WHERE cookie_hash = ? AND estado = 'RESERVADO' AND expira_en > ?",
                        (r, n) ->
                                new ContextoDemo(
                                        r.getObject("reserva_id", UUID.class),
                                        r.getString("id"),
                                        r.getObject("generacion", UUID.class),
                                        r.getTimestamp("expira_en").toInstant()),
                        hash,
                        Timestamp.from(ahora));
        return encontrados.stream()
                .filter(c -> propiedades.contiene(c.espacio()) && c.selector().equals(selector))
                .findFirst()
                .orElseThrow(ErrorDemo::invalida);
    }

    public ContextoDemo vigente(String hash, Instant ahora) {
        if (hash == null) return null;
        return jdbc
                .query(
                        "SELECT * FROM demo.espacios WHERE cookie_hash = ? AND estado = 'RESERVADO' AND expira_en > ?",
                        (r, n) ->
                                new ContextoDemo(
                                        r.getObject("reserva_id", UUID.class),
                                        r.getString("id"),
                                        r.getObject("generacion", UUID.class),
                                        r.getTimestamp("expira_en").toInstant()),
                        hash,
                        Timestamp.from(ahora))
                .stream()
                .filter(c -> propiedades.contiene(c.espacio()))
                .findFirst()
                .orElse(null);
    }

    public ContextoDemo reservar(String hash, Instant ahora) {
        return transaccion.execute(
                tx -> {
                    // Serializa el cupo entre procesos sin bloquear conexiones de negocio.
                    jdbc.execute("SELECT pg_advisory_xact_lock(16008)");
                    var todas = espacios();
                    long ocupados =
                            todas.stream().filter(e -> e.estado().equals("RESERVADO")).count();
                    var libre =
                            todas.stream()
                                    .filter(
                                            e ->
                                                    e.estado().equals("LISTO")
                                                            && e.bytes()
                                                                    < propiedades
                                                                            .almacenamientoBytes())
                                    .findFirst();
                    if (ocupados >= propiedades.cupo() || libre.isEmpty())
                        throw new ErrorDemo(409, "DEMO_CAPACIDAD_OCUPADA");
                    var espacio = libre.get();
                    var reserva = UUID.randomUUID();
                    var fin = ahora.plusSeconds(propiedades.duracionMinutos() * 60L);
                    int cambiadas =
                            jdbc.update(
                                    "UPDATE demo.espacios SET estado='RESERVADO', reserva_id=?, cookie_hash=?, expira_en=? WHERE id=? AND generacion=? AND estado='LISTO'",
                                    reserva,
                                    hash,
                                    Timestamp.from(fin),
                                    espacio.id(),
                                    espacio.generacion());
                    if (cambiadas != 1) throw new ErrorDemo(409, "DEMO_CAPACIDAD_OCUPADA");
                    evento(espacio.id(), espacio.generacion(), "RESERVADA", ahora);
                    return new ContextoDemo(reserva, espacio.id(), espacio.generacion(), fin);
                });
    }

    public int disponibles() {
        var todas = espacios();
        long libres =
                todas.stream()
                        .filter(
                                e ->
                                        e.estado().equals("LISTO")
                                                && e.bytes() < propiedades.almacenamientoBytes())
                        .count();
        long usadas = todas.stream().filter(e -> e.estado().equals("RESERVADO")).count();
        return (int) Math.max(0, Math.min(libres, propiedades.cupo() - usadas));
    }

    public void liberar(ContextoDemo contexto, Instant ahora) {
        cambiar(
                contexto.espacio(),
                contexto.generacion(),
                "RESERVADO",
                "DRENANDO",
                "LIBERADA",
                ahora);
    }

    public void expirar(Instant ahora) {
        for (var espacio : espacios()) {
            if (espacio.estado().equals("RESERVADO") && !espacio.expira().isAfter(ahora))
                cambiar(
                        espacio.id(),
                        espacio.generacion(),
                        "RESERVADO",
                        "DRENANDO",
                        "CADUCADA",
                        ahora);
        }
    }

    public void cambiar(
            String id, UUID generacion, String desde, String hacia, String evento, Instant ahora) {
        transaccion.executeWithoutResult(
                tx -> {
                    if (jdbc.update(
                                    "UPDATE demo.espacios SET estado=? WHERE id=? AND generacion=? AND estado=?",
                                    hacia,
                                    id,
                                    generacion,
                                    desde)
                            == 1) evento(id, generacion, evento, ahora);
                });
    }

    public void reciclable(Espacio espacio, Instant ahora) {
        transaccion.executeWithoutResult(
                tx -> {
                    if (jdbc.update(
                                    "UPDATE demo.espacios SET estado='RECICLABLE', cookie_hash=NULL, reserva_id=NULL, expira_en=NULL WHERE id=? AND generacion=? AND estado='DRENANDO'",
                                    espacio.id(),
                                    espacio.generacion())
                            == 1) evento(espacio.id(), espacio.generacion(), "DRENADA", ahora);
                });
    }

    public void bytes(ContextoDemo contexto, long bytes) {
        jdbc.update(
                "UPDATE demo.espacios SET bytes=? WHERE id=? AND generacion=?",
                bytes,
                contexto.espacio(),
                contexto.generacion());
    }

    private void evento(String espacio, UUID generacion, String tipo, Instant ahora) {
        jdbc.update(
                "INSERT INTO demo.eventos(id, espacio, generacion, tipo, instante) VALUES (?,?,?,?,?)",
                UUID.randomUUID(),
                espacio,
                generacion,
                tipo,
                Timestamp.from(ahora));
    }
}
