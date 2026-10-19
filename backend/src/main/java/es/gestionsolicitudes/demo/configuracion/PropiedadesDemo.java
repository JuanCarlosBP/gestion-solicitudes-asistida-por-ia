package es.gestionsolicitudes.demo.configuracion;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Properties;

/** Inventario cerrado del operador. Ningún destino procede de una petición HTTP. */
public final class PropiedadesDemo {
    private final Properties valores;
    private final Map<String, Destino> espacios;

    public record Destino(String url, String usuario, String clave) {
        @Override
        public String toString() {
            return "Destino[credenciales omitidas]";
        }
    }

    public PropiedadesDemo(Properties valores) {
        this.valores = new Properties();
        this.valores.putAll(valores);
        var destinos = new LinkedHashMap<String, Destino>();
        for (String id : requerido("espacios").split(",", -1)) {
            if (!id.matches("ag016_demo_[0-9]{2}") || destinos.containsKey(id)) invalida();
            Destino destino = destino("espacio." + id);
            validarUrl(destino.url(), id);
            if (!destino.usuario().matches("ag016_app_[0-9]{2}")
                    || !destino.usuario().endsWith(id.substring(id.length() - 2))) invalida();
            destinos.put(id, destino);
        }
        espacios = Map.copyOf(destinos);
        if (espacios.isEmpty() || espacios.size() > 10 || cupo() > espacios.size()) invalida();
        validarUrl(destino("control").url(), "ag016_control");
        if (!"ag016_control_app".equals(destino("control").usuario())) invalida();
        entero("duracion.minutos", 60, 1, 1440);
        entero("pool.maximo", 3, 1, 5);
        entero("peticiones.minuto", 240, 10, 10000);
        entero("reservas.minuto", 12, 1, 1000);
        entero("autenticacion.minuto", 20, 1, 120);
        entero("almacenamiento.bytes", 268435456, 1, Integer.MAX_VALUE);
    }

    public static PropiedadesDemo cargar(String ruta) {
        try {
            if (ruta == null || ruta.isBlank()) throw new IOException();
            var valores = new Properties();
            try (var lector = Files.newBufferedReader(Path.of(ruta))) {
                valores.load(lector);
            }
            return new PropiedadesDemo(valores);
        } catch (IOException | IllegalArgumentException error) {
            throw new IllegalStateException("Configuración demo ausente o inválida");
        }
    }

    private static void validarUrl(String url, String base) {
        // No parámetros JDBC ni credenciales incrustadas; destinos PostgreSQL explícitos.
        if (!url.matches("jdbc:postgresql://[a-zA-Z0-9._-]+:[0-9]{1,5}/" + base)) invalida();
    }

    private static void invalida() {
        throw new IllegalArgumentException("Configuración demo inválida");
    }

    public Map<String, Destino> espacios() {
        return espacios;
    }

    public int cupo() {
        return entero("cupo", 3, 1, 10);
    }

    public int duracionMinutos() {
        return entero("duracion.minutos", 60, 1, 1440);
    }

    public long almacenamientoBytes() {
        return entero("almacenamiento.bytes", 268435456, 1, Integer.MAX_VALUE);
    }

    public int peticionesMinuto() {
        return entero("peticiones.minuto", 240, 10, 10000);
    }

    public int reservasMinuto() {
        return entero("reservas.minuto", 12, 1, 1000);
    }

    public int autenticacionMinuto() {
        return entero("autenticacion.minuto", 20, 1, 120);
    }

    public int poolMaximo() {
        return entero("pool.maximo", 3, 1, 5);
    }

    public long metricasMilisegundos() {
        return Math.max(1, entero("metricas.segundos", 0, 0, 3600)) * 1000L;
    }

    public boolean metricasHabilitadas() {
        return entero("metricas.segundos", 0, 0, 3600) > 0;
    }

    public String requerido(String clave) {
        String valor = valores.getProperty(clave);
        if (valor == null || valor.isBlank()) invalida();
        return valor;
    }

    public Destino destino(String prefijo) {
        return new Destino(
                requerido(prefijo + ".url"),
                requerido(prefijo + ".usuario"),
                requerido(prefijo + ".clave"));
    }

    public boolean contiene(String espacio) {
        return espacios.containsKey(espacio);
    }

    public void exigirConfiguracionRuntime() {
        if (valores.stringPropertyNames().stream()
                .anyMatch(nombre -> nombre.startsWith("admin.") || nombre.startsWith("migracion.")))
            throw new IllegalStateException("El servidor HTTP no admite credenciales de provisión");
    }

    private int entero(String nombre, int defecto, int minimo, int maximo) {
        int valor = Integer.parseInt(valores.getProperty(nombre, Integer.toString(defecto)));
        if (valor < minimo || valor > maximo) invalida();
        return valor;
    }

    public static HikariDataSource pool(Destino destino, int maximo) {
        var config = new HikariConfig();
        config.setJdbcUrl(destino.url());
        config.setUsername(destino.usuario());
        config.setPassword(destino.clave());
        config.setMaximumPoolSize(maximo);
        config.setMinimumIdle(0);
        config.setConnectionTimeout(2000);
        config.setValidationTimeout(1000);
        config.setInitializationFailTimeout(-1);
        config.addDataSourceProperty("connectTimeout", "3");
        config.addDataSourceProperty("socketTimeout", "10");
        config.addDataSourceProperty("logServerErrorDetail", "false");
        return new HikariDataSource(config);
    }
}
