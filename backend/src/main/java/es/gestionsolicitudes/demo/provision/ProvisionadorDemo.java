package es.gestionsolicitudes.demo.provision;

import es.gestionsolicitudes.demo.aplicacion.CredencialesDemo;
import es.gestionsolicitudes.demo.configuracion.PropiedadesDemo;
import es.gestionsolicitudes.identidad.aplicacion.Contrasenas;
import es.gestionsolicitudes.identidad.dominio.Rol;
import es.gestionsolicitudes.identidad.persistencia.RepositorioIdentidadJdbc;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.BooleanSupplier;
import org.flywaydb.core.Flyway;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/**
 * Provisión privada sin Spring ni servidor HTTP. Máximo dos conexiones simultáneas; nunca fuerza
 * desconexiones. El supervisor conserva una sola JVM entre lotes.
 */
public final class ProvisionadorDemo {
    private final PropiedadesDemo propiedades;
    private final CredencialesDemo credenciales;
    private final Contrasenas contrasenas = new Contrasenas();

    public ProvisionadorDemo(PropiedadesDemo propiedades) {
        this.propiedades = propiedades;
        this.credenciales = new CredencialesDemo(Path.of(propiedades.requerido("semilla.ruta")));
        exigirAutorizacion();
        var admin = propiedades.destino("admin");
        if (!admin.usuario().equals("ag016_provision")
                || !admin.url().endsWith("/postgres")
                || !propiedades.requerido("migracion.usuario").equals("gestion_migracion"))
            throw new IllegalStateException("Identidad de provisión inválida");
        String servidor = admin.url().substring(0, admin.url().length() - "postgres".length());
        if (!propiedades.destino("control").url().equals(servidor + "ag016_control")
                || propiedades.espacios().entrySet().stream()
                        .anyMatch(e -> !e.getValue().url().equals(servidor + e.getKey())))
            throw new IllegalStateException("Inventario fuera del laboratorio");
    }

    private void exigirAutorizacion() {
        String entorno = propiedades.requerido("entorno");
        String confirmacion = "";
        if (!"local".equals(entorno)) {
            try {
                confirmacion = propiedades.requerido("provision.autorizacion");
            } catch (IllegalArgumentException error) {
                // Ausencia o blanco no autoriza la provisión: conserva el rechazo del contrato.
                throw new IllegalStateException("Provisión no autorizada para este entorno");
            }
        }
        AutorizacionProvision.exigir(entorno, confirmacion);
    }

    public void ejecutar() {
        ejecutar(true);
    }

    private void ejecutar(boolean bootstrap) {
        var admin = propiedades.destino("admin");
        try (var conexion =
                conectar(propiedades.destino("control").url(), admin.usuario(), admin.clave())) {
            var fuente = new SingleConnectionDataSource(conexion, true);
            if (bootstrap) {
                Flyway.configure()
                        .dataSource(fuente)
                        .locations("classpath:db/demo")
                        .defaultSchema("demo")
                        .schemas("demo")
                        .cleanDisabled(true)
                        .load()
                        .migrate();
            }
            var jdbc = new JdbcTemplate(fuente);
            if (!Boolean.TRUE.equals(
                    jdbc.queryForObject("SELECT pg_try_advisory_lock(16008001)", Boolean.class)))
                throw new IllegalStateException("Otro provisionador está activo");
            boolean fallo = false;
            try {
                verificarRoles(jdbc);
                for (String id : propiedades.espacios().keySet().stream().sorted().toList()) {
                    if (Thread.currentThread().isInterrupted()) break;
                    try {
                        preparar(jdbc, id, bootstrap);
                    } catch (RuntimeException | SQLException error) {
                        jdbc.update(
                                "UPDATE demo.espacios SET estado='BLOQUEADO' WHERE id=? AND estado='PREPARANDO'",
                                id);
                        registrar(jdbc, id, "FALLO_PROVISION");
                        System.getLogger(ProvisionadorDemo.class.getName())
                                .log(
                                        System.Logger.Level.ERROR,
                                        "DEMO_PROVISION_BLOQUEADA espacio={0}",
                                        id);
                        fallo = true;
                    }
                }
            } finally {
                jdbc.execute("SELECT pg_advisory_unlock(16008001)");
            }
            if (fallo)
                throw new IllegalStateException(
                        "Provisión incompleta; revisar estados BLOQUEADO sin reutilizarlos");
        } catch (SQLException error) {
            throw new IllegalStateException("Control de provisión no disponible");
        }
    }

    /**
     * Supervisor privado sin servidor HTTP. El bootstrap sigue siendo una operación manual de
     * {@code --demo-provisionar}; el sondeo no migra ni repara estados BLOQUEADO/PREPARANDO. No
     * retiene conexiones entre ciclos ni inicia una JVM por visitante.
     */
    public void supervisar() {
        Thread supervisor = Thread.currentThread();
        Thread apagado =
                new Thread(
                        () -> {
                            supervisor.interrupt();
                            try {
                                supervisor.join(30000);
                            } catch (InterruptedException error) {
                                Thread.currentThread().interrupt();
                            }
                        },
                        "demo-supervision-apagado");
        Runtime.getRuntime().addShutdownHook(apagado);
        try {
            supervisar(this::hayReciclables, () -> ejecutar(false), Thread::sleep);
        } finally {
            try {
                Runtime.getRuntime().removeShutdownHook(apagado);
            } catch (IllegalStateException error) {
                // El apagado de la JVM ya está en curso; el hook espera el cierre del lote.
            }
        }
    }

    @FunctionalInterface
    interface Espera {
        void esperar(long milisegundos) throws InterruptedException;
    }

    // Dependencias pequeñas para verificar interrupción y fallos sin sleeps ni PostgreSQL real.
    static void supervisar(BooleanSupplier hayTrabajo, Runnable lote, Espera espera) {
        while (!Thread.currentThread().isInterrupted()) {
            try {
                if (hayTrabajo.getAsBoolean()) lote.run();
            } catch (RuntimeException error) {
                // El lote ya conserva BLOQUEADO y continúa con otros espacios. Una caída de
                // control no debe provocar un bucle rápido ni registrar SQL/credenciales.
                System.getLogger(ProvisionadorDemo.class.getName())
                        .log(System.Logger.Level.WARNING, "DEMO_SUPERVISION_CICLO_FALLIDO");
            }
            try {
                espera.esperar(2000);
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    boolean hayReciclables() {
        var control = propiedades.destino("control");
        try (var conexion = conectar(control.url(), control.usuario(), control.clave())) {
            conexion.setReadOnly(true);
            try (var consulta = conexion.createStatement()) {
                consulta.setQueryTimeout(2);
                try (var filas =
                        consulta.executeQuery(
                                "SELECT id FROM demo.espacios WHERE estado='RECICLABLE' AND reserva_id IS NULL AND cookie_hash IS NULL AND expira_en IS NULL")) {
                    while (filas.next()) {
                        if (propiedades.contiene(filas.getString(1))) return true;
                    }
                    return false;
                }
            }
        } catch (SQLException error) {
            throw new IllegalStateException("Sondeo de control no disponible");
        }
    }

    void preparar(JdbcTemplate control, String id, boolean bootstrap) throws SQLException {
        var estados =
                control.queryForList(
                        "SELECT estado FROM demo.espacios WHERE id=?", String.class, id);
        boolean nueva = estados.isEmpty();
        if (!bootstrap && (nueva || !"RECICLABLE".equals(estados.getFirst()))) return;
        if (!nueva && "PREPARANDO".equals(estados.getFirst())) {
            control.update(
                    "UPDATE demo.espacios SET estado='BLOQUEADO' WHERE id=? AND estado='PREPARANDO'",
                    id);
            registrar(control, id, "PREPARACION_INTERRUMPIDA");
            throw new IllegalStateException("Preparación interrumpida requiere revisión");
        }
        if (!nueva && !"RECICLABLE".equals(estados.getFirst())) return;
        UUID generacion = UUID.randomUUID();
        if (nueva) {
            control.update(
                    "INSERT INTO demo.espacios(id,generacion,estado) VALUES (?,?,'PREPARANDO')",
                    id,
                    generacion);
        } else {
            int reclamada =
                    control.update(
                            "UPDATE demo.espacios SET estado='PREPARANDO', generacion=?, bytes=0 WHERE id=? AND estado='RECICLABLE' AND reserva_id IS NULL AND cookie_hash IS NULL AND expira_en IS NULL",
                            generacion,
                            id);
            if (reclamada != 1) throw new IllegalStateException("Espacio no reciclable");
        }
        registrar(control, id, "PREPARACION_INICIADA");
        verificarSinConexiones(control, id);
        if (!nueva) recrear(id);
        var destino = propiedades.espacios().get(id);
        try (var conexion =
                conectar(
                        destino.url(),
                        propiedades.requerido("migracion.usuario"),
                        propiedades.requerido("migracion.clave"))) {
            var fuente = new SingleConnectionDataSource(conexion, true);
            var jdbc = new JdbcTemplate(fuente);
            if (Boolean.TRUE.equals(
                    jdbc.queryForObject(
                            "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='gestion')",
                            Boolean.class)))
                throw new IllegalStateException("Bootstrap exige base vacía inventariada");
            Flyway.configure()
                    .dataSource(fuente)
                    .locations("classpath:db/migration")
                    .defaultSchema("gestion")
                    .schemas("gestion")
                    .createSchemas(false)
                    .cleanDisabled(true)
                    .load()
                    .migrate();
            conexion.setAutoCommit(false);
            try {
                var identidad = new RepositorioIdentidadJdbc(fuente);
                for (Rol rol : List.of(Rol.SOLICITANTE, Rol.SUPERVISOR, Rol.AUDITOR)) {
                    identidad.crearUsuario(
                            UUID.randomUUID(),
                            CredencialesDemo.correo(generacion, rol),
                            "Demo " + rol.name().toLowerCase(java.util.Locale.ROOT),
                            contrasenas.codificar(credenciales.clave(id, generacion, rol)),
                            Set.of(rol),
                            Instant.now());
                }
                for (int numero = 1; numero <= 20; numero++) {
                    jdbc.update(
                            "INSERT INTO gestion.proveedores(id,tipo,denominacion,pais_fiscal,identificador_fiscal,identificador_fiscal_normalizado,creado_en,actualizado_en) VALUES (?,'PERSONA_JURIDICA',?,'ES',?,?,?,?)",
                            UUID.nameUUIDFromBytes(
                                    ("demo-proveedor-" + numero)
                                            .getBytes(java.nio.charset.StandardCharsets.UTF_8)),
                            "Proveedor ficticio " + numero,
                            "DEMO000" + numero,
                            "DEMO000" + numero,
                            Timestamp.from(Instant.now()),
                            Timestamp.from(Instant.now()));
                }
                conexion.commit();
            } catch (RuntimeException error) {
                conexion.rollback();
                throw new IllegalStateException("Semilla demo no preparada");
            } finally {
                conexion.setAutoCommit(true);
            }
            Long bytes =
                    jdbc.queryForObject("SELECT pg_database_size(current_database())", Long.class);
            if (bytes == null) throw new IllegalStateException("Tamaño de base no disponible");
            control.update(
                    "UPDATE demo.espacios SET estado='LISTO',bytes=? WHERE id=? AND generacion=? AND estado='PREPARANDO'",
                    bytes,
                    id,
                    generacion);
            registrar(control, id, "PREPARADA");
        }
    }

    private void recrear(String id) throws SQLException {
        // Id solo de la lista cerrada y ya validado por PropiedadesDemo; nunca proviene de HTTP.
        exigirAutorizacion();
        if (!propiedades.contiene(id) || !id.matches("ag016_demo_[0-9]{2}"))
            throw new IllegalStateException("Recreación no autorizada");
        var admin = propiedades.destino("admin");
        try (var conexion = conectar(admin.url(), admin.usuario(), admin.clave())) {
            var jdbc = new JdbcTemplate(new SingleConnectionDataSource(conexion, true));
            verificarSinConexiones(jdbc, id);
            jdbc.execute("DROP DATABASE \"" + id + "\"");
            jdbc.execute("CREATE DATABASE \"" + id + "\" OWNER gestion_migracion");
            jdbc.execute("REVOKE ALL ON DATABASE \"" + id + "\" FROM PUBLIC");
            jdbc.execute(
                    "GRANT CONNECT ON DATABASE \""
                            + id
                            + "\" TO \""
                            + propiedades.espacios().get(id).usuario()
                            + "\"");
        }
        try (var conexion =
                conectar(
                        propiedades.espacios().get(id).url(),
                        propiedades.requerido("migracion.usuario"),
                        propiedades.requerido("migracion.clave"))) {
            var jdbc = new JdbcTemplate(new SingleConnectionDataSource(conexion, true));
            jdbc.execute("REVOKE ALL ON SCHEMA public FROM PUBLIC");
            jdbc.execute("CREATE SCHEMA gestion AUTHORIZATION gestion_migracion");
        }
    }

    private void verificarSinConexiones(JdbcTemplate jdbc, String id) {
        Integer conexiones =
                jdbc.queryForObject(
                        "SELECT count(*) FROM pg_stat_activity WHERE datname=?", Integer.class, id);
        if (conexiones == null || conexiones != 0)
            throw new IllegalStateException("Base con conexiones; no se recrea");
    }

    private void verificarRoles(JdbcTemplate jdbc) {
        var roles = new java.util.ArrayList<String>();
        roles.add("gestion_app");
        roles.add("ag016_control_app");
        roles.add("gestion_migracion");
        propiedades.espacios().values().forEach(d -> roles.add(d.usuario()));
        for (String rol : roles) {
            Boolean peligro =
                    jdbc.queryForObject(
                            "SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls FROM pg_roles WHERE rolname=?",
                            Boolean.class,
                            rol);
            if (!Boolean.FALSE.equals(peligro))
                throw new IllegalStateException("Privilegios de ejecución excesivos");
        }
        if (!Boolean.FALSE.equals(
                jdbc.queryForObject(
                        "SELECT rolcanlogin FROM pg_roles WHERE rolname='gestion_app'",
                        Boolean.class)))
            throw new IllegalStateException("Rol de objetos no puede iniciar sesión");
        var bases =
                jdbc.queryForList(
                        "SELECT datname FROM pg_database WHERE datallowconn", String.class);
        for (var entrada : propiedades.espacios().entrySet()) {
            for (String base : bases) {
                boolean permitido =
                        Boolean.TRUE.equals(
                                jdbc.queryForObject(
                                        "SELECT has_database_privilege(?,?,'CONNECT')",
                                        Boolean.class,
                                        entrada.getValue().usuario(),
                                        base));
                if (!base.startsWith("template") && permitido != base.equals(entrada.getKey()))
                    throw new IllegalStateException("CONNECT fuera del ámbito autorizado");
                if (!base.equals(entrada.getKey()))
                    verificarConexionDenegada(entrada.getValue(), base);
            }
        }
        for (String base : bases) {
            boolean permitido =
                    Boolean.TRUE.equals(
                            jdbc.queryForObject(
                                    "SELECT has_database_privilege('ag016_control_app',?,'CONNECT')",
                                    Boolean.class,
                                    base));
            if (!base.startsWith("template") && permitido != base.equals("ag016_control"))
                throw new IllegalStateException("CONNECT control fuera del ámbito autorizado");
            if (!base.equals("ag016_control"))
                verificarConexionDenegada(propiedades.destino("control"), base);
        }
    }

    private void verificarConexionDenegada(PropiedadesDemo.Destino destino, String base) {
        if (!base.matches("[a-zA-Z0-9_]+"))
            throw new IllegalStateException("Base ajena al inventario esperado");
        String url = destino.url().substring(0, destino.url().lastIndexOf('/') + 1) + base;
        try (var conexion = conectar(url, destino.usuario(), destino.clave())) {
            if (!conexion.isValid(2))
                throw new IllegalStateException("No se pudo comprobar CONNECT");
        } catch (SQLException error) {
            // La denegación ha de ser de autorización; un timeout o caída no demuestra aislamiento.
            if (!"28000".equals(error.getSQLState()) && !"42501".equals(error.getSQLState()))
                throw new IllegalStateException("No se pudo comprobar CONNECT");
            return;
        }
        throw new IllegalStateException("Conexión cruzada permitida");
    }

    private void registrar(JdbcTemplate jdbc, String id, String tipo) {
        jdbc.update(
                "INSERT INTO demo.eventos(id,espacio,generacion,tipo,instante) SELECT ?,id,generacion,?,? FROM demo.espacios WHERE id=?",
                UUID.randomUUID(),
                tipo,
                Timestamp.from(Instant.now()),
                id);
    }

    private static Connection conectar(String url, String usuario, String clave)
            throws SQLException {
        var propiedades = new java.util.Properties();
        propiedades.setProperty("user", usuario);
        propiedades.setProperty("password", clave);
        propiedades.setProperty("connectTimeout", "3");
        propiedades.setProperty("socketTimeout", "30");
        propiedades.setProperty("logServerErrorDetail", "false");
        return DriverManager.getConnection(url, propiedades);
    }
}
