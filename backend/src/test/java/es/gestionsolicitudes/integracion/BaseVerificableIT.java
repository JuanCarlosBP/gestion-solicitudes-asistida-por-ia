package es.gestionsolicitudes.integracion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import es.gestionsolicitudes.GestionSolicitudesApplication;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.Duration;
import java.util.Map;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.json.JsonMapper;

class BaseVerificableIT {
    private static final String IMAGEN =
            "postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826";

    private PostgreSQLContainer contenedor() {
        return new PostgreSQLContainer(
                        DockerImageName.parse(IMAGEN).asCompatibleSubstituteFor("postgres"))
                .withDatabaseName("gestion")
                .withCommand(
                        "postgres",
                        "-c",
                        "log_error_verbosity=terse",
                        "-c",
                        "log_min_error_statement=panic",
                        "-c",
                        "log_parameter_max_length_on_error=0",
                        "-c",
                        "log_statement=none",
                        "-c",
                        "log_min_duration_statement=-1",
                        "-c",
                        "log_min_duration_sample=-1",
                        "-c",
                        "log_line_prefix=%m [%p] %e ")
                .withUsername("administrador_prueba")
                .withPassword("administracion-ficticia-prueba")
                .withInitScript("postgres-inicial.sql");
    }

    private ConfigurableApplicationContext arrancar(PostgreSQLContainer base, String... opciones) {
        return new SpringApplicationBuilder(GestionSolicitudesApplication.class)
                .profiles("test")
                .properties(
                        Map.of(
                                "DB_URL", base.getJdbcUrl(),
                                "DB_USUARIO", "gestion_app",
                                "DB_CLAVE", "aplicacion-ficticia-prueba",
                                "MIGRACION_USUARIO", "gestion_migracion",
                                "MIGRACION_CLAVE", "migracion-ficticia-prueba",
                                "spring.main.banner-mode", "off"))
                .run(opciones);
    }

    private HttpResponse<String> consultar(
            HttpClient cliente, ConfigurableApplicationContext contexto, String ruta)
            throws Exception {
        String puerto = contexto.getEnvironment().getRequiredProperty("local.server.port");
        return cliente.send(
                HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + puerto + ruta))
                        .timeout(Duration.ofSeconds(10))
                        .GET()
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void primerArranqueContratoPermisosYSegundoArranque() throws Exception {
        try (var base = contenedor();
                var cliente = HttpClient.newHttpClient()) {
            base.start();
            try (var contexto = arrancar(base, "--server.port=0")) {
                var salud = consultar(cliente, contexto, "/api/salud");
                assertThat(salud.statusCode()).isEqualTo(200);
                assertThat(salud.body()).isEqualTo("{\"estado\":\"DISPONIBLE\"}");
                assertThat(contexto.getBean(Flyway.class).info().applied()).hasSize(2);
                var contrato = consultar(cliente, contexto, "/v3/api-docs");
                assertThat(contrato.statusCode()).isEqualTo(200);
                var json = JsonMapper.builder().build().readTree(contrato.body());
                assertThat(json.path("openapi").asString()).startsWith("3.1.");
                var respuestas =
                        json.path("paths").path("/api/salud").path("get").path("responses");
                assertThat(respuestas.has("200")).isTrue();
                assertThat(respuestas.has("503")).isTrue();
                assertThat(json.path("paths").size()).isEqualTo(6);
                assertThat(json.path("components").path("securitySchemes").has("BearerAuth"))
                        .isTrue();
                assertThat(
                                json.path("components")
                                        .path("schemas")
                                        .path("RespuestaSalud")
                                        .path("properties")
                                        .has("estado"))
                        .isTrue();
                assertThat(consultar(cliente, contexto, "/swagger-ui/index.html").statusCode())
                        .isEqualTo(200);
                assertThat(consultar(cliente, contexto, "/actuator/env").statusCode())
                        .isEqualTo(401);
                comprobarPermisos(base);
            }
            // Mismo PostgreSQL y volumen del contenedor: se conserva el historial.
            try (var segundo = arrancar(base, "--server.port=0")) {
                assertThat(segundo.getBean(Flyway.class).info().applied()).hasSize(2);
                assertThat(segundo.getBean(Flyway.class).migrate().migrationsExecuted).isZero();
                assertThat(consultar(cliente, segundo, "/api/salud").statusCode()).isEqualTo(200);
            }
        }
    }

    private void comprobarPermisos(PostgreSQLContainer base) throws SQLException {
        try (var conexion =
                        DriverManager.getConnection(
                                base.getJdbcUrl(), "gestion_app", "aplicacion-ficticia-prueba");
                var sentencia = conexion.createStatement()) {
            assertThatThrownBy(
                            () ->
                                    sentencia.execute(
                                            "CREATE TABLE gestion.no_permitida (id integer)"))
                    .isInstanceOf(SQLException.class)
                    .satisfies(
                            error ->
                                    assertThat(((SQLException) error).getSQLState())
                                            .isEqualTo("42501"));
            assertThatThrownBy(
                            () ->
                                    sentencia.executeQuery(
                                            "SELECT * FROM gestion.flyway_schema_history"))
                    .isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> sentencia.execute("CREATE ROLE no_permitido"))
                    .isInstanceOf(SQLException.class);
        }
        try (var conexion =
                        DriverManager.getConnection(
                                base.getJdbcUrl(), base.getUsername(), base.getPassword());
                var sentencia = conexion.createStatement();
                var resultado =
                        sentencia.executeQuery(
                                "SELECT tablename FROM pg_tables WHERE schemaname = 'gestion'")) {
            var tablas = new java.util.HashSet<String>();
            while (resultado.next()) {
                tablas.add(resultado.getString(1));
            }
            assertThat(tablas)
                    .containsExactlyInAnyOrder(
                            "flyway_schema_history",
                            "usuarios",
                            "roles",
                            "usuarios_roles",
                            "sesiones_acceso",
                            "tokens_refresco");
        }
    }

    @Test
    void unaMigracionInvalidaImpideElArranqueSinAlterarOtraBase() {
        try (var base = contenedor()) {
            base.start();
            assertThatThrownBy(
                            () -> {
                                try (var ignorado =
                                        arrancar(
                                                base,
                                                "--server.port=0",
                                                "--spring.flyway.locations=classpath:db/migration,classpath:db/invalida")) {
                                    throw new AssertionError(
                                            "Una migración inválida no debe permitir el arranque");
                                }
                            })
                    .isInstanceOf(org.springframework.beans.BeansException.class);
            // Una nueva aplicación con ubicaciones válidas se recupera del rollback de PostgreSQL.
            try (var contexto = arrancar(base, "--server.port=0")) {
                assertThat(contexto.getBean(Flyway.class).info().applied()).hasSize(2);
            }
        }
    }

    @Test
    void caidaRealDePostgresDevuelve503AcotadoSinDatosInternos() throws Exception {
        try (var base = contenedor();
                var cliente = HttpClient.newHttpClient()) {
            base.start();
            try (var contexto = arrancar(base, "--server.port=0")) {
                assertThat(consultar(cliente, contexto, "/api/salud").statusCode()).isEqualTo(200);
                base.stop();
                long inicio = System.nanoTime();
                var salud = consultar(cliente, contexto, "/api/salud");
                assertThat(salud.statusCode()).isEqualTo(503);
                assertThat(salud.body()).isEqualTo("{\"estado\":\"NO_DISPONIBLE\"}");
                assertThat(Duration.ofNanos(System.nanoTime() - inicio))
                        .isLessThan(Duration.ofSeconds(8));
            }
        }
    }
}
