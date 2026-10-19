package es.gestionsolicitudes.demo.persistencia;

import com.zaxxer.hikari.HikariDataSource;
import es.gestionsolicitudes.demo.configuracion.PropiedadesDemo;
import es.gestionsolicitudes.demo.dominio.ContextoDemo;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.datasource.AbstractDataSource;

/** Sin base por defecto; el pool queda ligado a una generación hasta su drenaje. */
public final class FuenteDemo extends AbstractDataSource implements AutoCloseable {
    private record Pool(UUID generacion, HikariDataSource fuente) {}

    private final PropiedadesDemo propiedades;
    private final Map<String, Pool> pools = new HashMap<>();

    public FuenteDemo(PropiedadesDemo propiedades) {
        this.propiedades = propiedades;
    }

    @Override
    public Connection getConnection() throws SQLException {
        var contexto = ContextoDemo.exigir();
        return obtener(contexto.espacio(), contexto.generacion()).getConnection();
    }

    @Override
    public Connection getConnection(String usuario, String clave) throws SQLException {
        throw new SQLException("No se permite seleccionar credenciales por petición");
    }

    private synchronized HikariDataSource obtener(String espacio, UUID generacion) {
        if (!propiedades.contiene(espacio))
            throw new IllegalStateException("Destino no autorizado");
        var actual = pools.get(espacio);
        if (actual != null && !actual.generacion().equals(generacion))
            throw new IllegalStateException("Generación no drenada");
        if (actual == null) {
            actual =
                    new Pool(
                            generacion,
                            PropiedadesDemo.pool(
                                    propiedades.espacios().get(espacio), propiedades.poolMaximo()));
            pools.put(espacio, actual);
        }
        return actual.fuente();
    }

    /** Solo bajo exclusión del gate: no hay petición admitida que pueda conservar la conexión. */
    public synchronized void drenar(String espacio) {
        var pool = pools.remove(espacio);
        if (pool != null) pool.fuente().close();
    }

    public long bytes(String espacio, UUID generacion) throws SQLException {
        try (var conexion = obtener(espacio, generacion).getConnection();
                var consulta =
                        conexion.prepareStatement("SELECT pg_database_size(current_database())")) {
            consulta.setQueryTimeout(2);
            try (var resultado = consulta.executeQuery()) {
                resultado.next();
                return resultado.getLong(1);
            }
        }
    }

    @Override
    public synchronized void close() {
        pools.values().forEach(pool -> pool.fuente().close());
        pools.clear();
    }
}
