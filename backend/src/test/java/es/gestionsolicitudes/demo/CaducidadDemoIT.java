package es.gestionsolicitudes.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import es.gestionsolicitudes.demo.aplicacion.ServicioDemo;
import es.gestionsolicitudes.demo.configuracion.PropiedadesDemo;
import es.gestionsolicitudes.demo.dominio.ContextoDemo;
import es.gestionsolicitudes.demo.http.FiltroContextoDemo;
import es.gestionsolicitudes.demo.persistencia.FuenteDemo;
import es.gestionsolicitudes.demo.persistencia.RepositorioDemo;
import es.gestionsolicitudes.integracion.ContenedoresPrueba;
import jakarta.servlet.http.Cookie;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Aísla la admisión temporal sobre PostgreSQL real: no arranca Spring, servidor ni reconciliador.
 * El reloj fijo pertenece solo al servicio de cada caso; no modifica relojes globales.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class CaducidadDemoIT {
    private static final String IMAGEN =
            "postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826";
    private static final String ESPACIO = "ag016_demo_01";
    private static final String COOKIE_FICTICIA = "C".repeat(43);
    // PostgreSQL conserva microsegundos: ninguno de los tres instantes requiere redondeo.
    private static final Instant EXPIRA = Instant.parse("2026-01-01T00:00:00.123456Z");
    private static final ContextoDemo CONTEXTO =
            new ContextoDemo(
                    UUID.fromString("16008000-0000-4000-8000-000000000001"),
                    ESPACIO,
                    UUID.fromString("16008000-0000-4000-8000-000000000002"),
                    EXPIRA);

    private PostgreSQLContainer base;
    private JdbcTemplate adminControl;
    private DriverManagerDataSource controlRuntime;
    private PropiedadesDemo propiedades;

    @BeforeAll
    void prepararControlExclusivo() {
        base =
                ContenedoresPrueba.postgres(
                                DockerImageName.parse(IMAGEN).asCompatibleSubstituteFor("postgres"))
                        .withDatabaseName("gestion")
                        .withUsername("administrador_prueba")
                        .withPassword("administracion-ficticia-prueba")
                        .withInitScript("postgres-inicial.sql")
                        .withLabel("gestion.qa.ensayo", "caducidad-demo-frontera")
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
                                "log_min_duration_sample=-1");
        base.start();
        var admin =
                new JdbcTemplate(fuente(base.getJdbcUrl(), base.getUsername(), base.getPassword()));
        admin.execute(
                "CREATE ROLE ag016_control_app LOGIN PASSWORD 'control-ficticio-caducidad'"
                        + " NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS");
        admin.execute(
                "CREATE ROLE ag016_app_01 LOGIN PASSWORD 'espacio-ficticio-caducidad'"
                        + " NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS");
        admin.execute("CREATE DATABASE ag016_control OWNER gestion_migracion");
        admin.execute("REVOKE ALL ON DATABASE ag016_control FROM PUBLIC");
        admin.execute("GRANT CONNECT ON DATABASE ag016_control TO ag016_control_app");
        String servidor =
                "jdbc:postgresql://" + base.getHost() + ":" + base.getMappedPort(5432) + "/";
        var controlAdmin =
                fuente(servidor + "ag016_control", base.getUsername(), base.getPassword());
        assertThat(
                        Flyway.configure()
                                .dataSource(controlAdmin)
                                .locations("classpath:db/demo")
                                .defaultSchema("demo")
                                .schemas("demo")
                                .cleanDisabled(true)
                                .load()
                                .migrate()
                                .migrationsExecuted)
                .isEqualTo(1);
        adminControl = new JdbcTemplate(controlAdmin);
        adminControl.update(
                "INSERT INTO demo.espacios(id,generacion,estado,reserva_id,cookie_hash,expira_en)"
                        + " VALUES (?,?,'RESERVADO',?,?,?)",
                ESPACIO,
                CONTEXTO.generacion(),
                CONTEXTO.reservaId(),
                ServicioDemo.hash(COOKIE_FICTICIA),
                Timestamp.from(EXPIRA));
        var valores = new Properties();
        valores.setProperty("entorno", "local");
        valores.setProperty("espacios", ESPACIO);
        valores.setProperty("cupo", "1");
        valores.setProperty("control.url", servidor + "ag016_control");
        valores.setProperty("control.usuario", "ag016_control_app");
        valores.setProperty("control.clave", "control-ficticio-caducidad");
        valores.setProperty("espacio." + ESPACIO + ".url", servidor + ESPACIO);
        valores.setProperty("espacio." + ESPACIO + ".usuario", "ag016_app_01");
        valores.setProperty("espacio." + ESPACIO + ".clave", "espacio-ficticio-caducidad");
        propiedades = new PropiedadesDemo(valores);
        controlRuntime =
                fuente(
                        propiedades.destino("control").url(),
                        propiedades.destino("control").usuario(),
                        propiedades.destino("control").clave());
        comprobarReservaIntacta();
    }

    @AfterAll
    void conservarSegunPoliticaDelContenedor() {
        // ContenedoresPrueba aplica conservación e identidad etiquetada en la ejecución AG-016.
        if (base != null) base.stop();
    }

    @AfterEach
    void limpiarContextoDeLaPrueba() {
        ContextoDemo.limpiar();
    }

    @ParameterizedTest(
            name = "admisión con desplazamiento de {0} microsegundos respecto al vencimiento")
    @ValueSource(longs = {-1, 0, 1})
    void fronteraTemporalDeniegaSinReconciliarNiAlterarReserva(long microsegundos)
            throws Exception {
        comprobarReservaIntacta();
        assertThat(ContextoDemo.actual()).isNull();
        var reloj = Clock.fixed(EXPIRA.plusNanos(microsegundos * 1000), ZoneOffset.UTC);
        var repositorio = new RepositorioDemo(controlRuntime, propiedades);
        try (var fuenteNegocio = new FuenteDemo(propiedades)) {
            assertThatThrownBy(fuenteNegocio::getConnection)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("Contexto demo obligatorio");
            var servicio = new ServicioDemo(propiedades, repositorio, fuenteNegocio, reloj);
            var filtro = new FiltroContextoDemo(servicio);
            var peticion = new MockHttpServletRequest("GET", "/api/proveedores");
            peticion.setCookies(new Cookie(FiltroContextoDemo.COOKIE, COOKIE_FICTICIA));
            peticion.addHeader("X-Demo-Contexto", CONTEXTO.selector());
            var respuesta = new MockHttpServletResponse();
            var invocacionesNegocio = new AtomicInteger();

            filtro.doFilter(
                    peticion,
                    respuesta,
                    (solicitud, salida) -> {
                        invocacionesNegocio.incrementAndGet();
                        assertThat(ContextoDemo.exigir()).isEqualTo(CONTEXTO);
                    });

            assertThat(respuesta.getHeader("Cache-Control")).isEqualTo("no-store");
            if (microsegundos < 0) {
                assertThat(invocacionesNegocio.get()).isEqualTo(1);
                assertThat(respuesta.getStatus()).isEqualTo(200);
                assertThat(respuesta.getContentAsString()).isEmpty();
            } else {
                assertThat(invocacionesNegocio.get()).isZero();
                assertThat(respuesta.getStatus()).isEqualTo(401);
                assertThat(respuesta.getContentAsString())
                        .isEqualTo("{\"error\":\"DEMO_RESERVA_INVALIDA\"}");
            }
            assertThat(ContextoDemo.actual()).isNull();
            assertThatThrownBy(fuenteNegocio::getConnection)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("Contexto demo obligatorio");
            comprobarReservaIntacta();
        }
    }

    private void comprobarReservaIntacta() {
        assertThat(
                        adminControl.queryForObject(
                                "SELECT estado FROM demo.espacios WHERE id=?",
                                String.class,
                                ESPACIO))
                .isEqualTo("RESERVADO");
        assertThat(
                        adminControl
                                .queryForObject(
                                        "SELECT expira_en FROM demo.espacios WHERE id=?",
                                        Timestamp.class,
                                        ESPACIO)
                                .toInstant())
                .isEqualTo(EXPIRA);
        assertThat(adminControl.queryForObject("SELECT count(*) FROM demo.eventos", Integer.class))
                .isZero();
    }

    private static DriverManagerDataSource fuente(String url, String usuario, String clave) {
        var fuente = new DriverManagerDataSource(url, usuario, clave);
        var opciones = new Properties();
        opciones.setProperty("logServerErrorDetail", "false");
        fuente.setConnectionProperties(opciones);
        return fuente;
    }
}
