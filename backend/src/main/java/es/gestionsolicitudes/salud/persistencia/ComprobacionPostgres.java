package es.gestionsolicitudes.salud.persistencia;

import es.gestionsolicitudes.salud.aplicacion.ComprobacionBaseDatos;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.springframework.stereotype.Repository;

@Repository
@org.springframework.context.annotation.Profile("!demo")
public class ComprobacionPostgres implements ComprobacionBaseDatos {
    private final DataSource dataSource;

    public ComprobacionPostgres(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public boolean disponible() {
        try (var conexion = dataSource.getConnection();
                var consulta = conexion.prepareStatement("SELECT 1")) {
            consulta.setQueryTimeout(2);
            try (var resultado = consulta.executeQuery()) {
                return resultado.next() && resultado.getInt(1) == 1;
            }
        } catch (SQLException falloDependencia) {
            // El estado público no incluye mensajes del driver, SQL ni configuración.
            return false;
        }
    }
}
