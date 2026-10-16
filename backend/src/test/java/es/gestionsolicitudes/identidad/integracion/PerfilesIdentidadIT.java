package es.gestionsolicitudes.identidad.integracion;

import static org.assertj.core.api.Assertions.*;

import es.gestionsolicitudes.GestionSolicitudesApplication;
import es.gestionsolicitudes.identidad.aplicacion.ServicioAutenticacion;
import es.gestionsolicitudes.identidad.configuracion.AprovisionamientoLocal;
import es.gestionsolicitudes.identidad.configuracion.ClavesRsa;
import es.gestionsolicitudes.identidad.dominio.Rol;
import es.gestionsolicitudes.integracion.ContenedoresPrueba;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.*;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PerfilesIdentidadIT {
    private static final String IMAGEN =
            "postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826";
    private static final String CLAVE_FICTICIA = "Frase ficticia de demostración para pruebas";
    private PostgreSQLContainer base;
    private JdbcTemplate administrador;

    @BeforeAll
    void prepararBase() {
        base =
                ContenedoresPrueba.postgres(
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
        base.start();
        var fuenteAdmin =
                new DriverManagerDataSource(
                        base.getJdbcUrl(), base.getUsername(), base.getPassword());
        var propiedadesAdmin = new java.util.Properties();
        propiedadesAdmin.setProperty("logServerErrorDetail", "false");
        fuenteAdmin.setConnectionProperties(propiedadesAdmin);
        administrador = new JdbcTemplate(fuenteAdmin);
        try (var contexto = arrancar("test", Map.of())) {
            assertThat(contexto.getBeansOfType(AprovisionamientoLocal.class)).isEmpty();
        }
    }

    @BeforeEach
    void limpiarCuentas() {
        administrador.execute(
                "TRUNCATE gestion.usuarios, gestion.usuarios_roles, gestion.sesiones_acceso, gestion.tokens_refresco CASCADE");
    }

    @AfterAll
    void pararBase() {
        if (base != null) base.stop();
    }

    private ConfigurableApplicationContext arrancar(String perfil, Map<String, Object> extras) {
        var propiedades =
                new HashMap<String, Object>(
                        Map.of(
                                "DB_URL",
                                base.getJdbcUrl(),
                                "DB_USUARIO",
                                "gestion_app",
                                "DB_CLAVE",
                                "aplicacion-ficticia-prueba",
                                "MIGRACION_USUARIO",
                                "gestion_migracion",
                                "MIGRACION_CLAVE",
                                "migracion-ficticia-prueba",
                                "spring.main.banner-mode",
                                "off"));
        propiedades.putAll(extras);
        return new SpringApplicationBuilder(GestionSolicitudesApplication.class)
                .profiles(perfil)
                .properties(propiedades)
                .run("--server.port=0");
    }

    private Map<String, Object> demos() {
        var datos = new HashMap<String, Object>();
        for (Rol rol : Rol.values()) {
            String prefijo = "DEMO_" + rol.name() + "_";
            datos.put(prefijo + "CORREO", " " + rol.name() + "@EJEMPLO.INVALID ");
            datos.put(prefijo + "NOMBRE", "Demostración " + rol.name());
            datos.put(prefijo + "CLAVE", CLAVE_FICTICIA);
        }
        return datos;
    }

    @Test
    void localSinVariablesOConGruposVaciosNoCreaUsuarios() {
        try (var contexto = arrancar("local", Map.of())) {
            assertThat(contexto.getBeansOfType(AprovisionamientoLocal.class)).hasSize(1);
            assertThat(
                            administrador.queryForObject(
                                    "SELECT count(*) FROM gestion.usuarios", Integer.class))
                    .isZero();
        }
        var vacios = demos();
        vacios.replaceAll((nombre, valor) -> "");
        try (var contexto = arrancar("local", vacios)) {
            assertThat(contexto.getBeansOfType(AprovisionamientoLocal.class)).hasSize(1);
            assertThat(
                            administrador.queryForObject(
                                    "SELECT count(*) FROM gestion.usuarios", Integer.class))
                    .isZero();
        }
    }

    @Test
    void grupoParcialOClaveFueraDePoliticaFallaSinAprovisionarParcialmente() {
        var parcial = demos();
        parcial.remove("DEMO_SUPERVISOR_CLAVE");
        assertThatThrownBy(
                        () -> {
                            try (var ignorado = arrancar("local", parcial)) {
                                throw new AssertionError("No debe arrancar con un grupo parcial");
                            }
                        })
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Aprovisionamiento local inválido");
        assertThat(
                        administrador.queryForObject(
                                "SELECT count(*) FROM gestion.usuarios", Integer.class))
                .isZero();
        var debil = demos();
        debil.put("DEMO_AUDITOR_CLAVE", "passwordpassword");
        assertThatThrownBy(
                        () -> {
                            try (var ignorado = arrancar("local", debil)) {
                                throw new AssertionError("No debe arrancar con una clave común");
                            }
                        })
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Aprovisionamiento local inválido");
        assertThat(
                        administrador.queryForObject(
                                "SELECT count(*) FROM gestion.usuarios", Integer.class))
                .isZero();
    }

    @Test
    void localCreaCuatroRolesIdempotentementeYRefreshSobreviveReinicio() {
        String accesoAnterior;
        String refresh;
        String hashAnterior;
        try (var primero = arrancar("local", demos())) {
            assertThat(
                            administrador.queryForObject(
                                    "SELECT count(*) FROM gestion.usuarios", Integer.class))
                    .isEqualTo(4);
            assertThat(
                            administrador.queryForObject(
                                    "SELECT count(DISTINCT rol) FROM gestion.usuarios_roles",
                                    Integer.class))
                    .isEqualTo(4);
            var acceso =
                    primero.getBean(ServicioAutenticacion.class)
                            .iniciar("solicitante@ejemplo.invalid", CLAVE_FICTICIA)
                            .orElseThrow();
            accesoAnterior = acceso.accessToken();
            refresh = acceso.refresh();
            hashAnterior =
                    administrador.queryForObject(
                            "SELECT clave_hash FROM gestion.usuarios WHERE correo = 'solicitante@ejemplo.invalid'",
                            String.class);
            assertThat(hashAnterior.startsWith("$argon2id$")).isTrue();
            for (int numero = 0; numero < 5; numero++) {
                assertThat(
                                primero.getBean(ServicioAutenticacion.class)
                                        .iniciar(
                                                "supervisor@ejemplo.invalid",
                                                "incorrecta ficticia de prueba")
                                        .isEmpty())
                        .isTrue();
            }
        }
        try (var segundo = arrancar("local", demos())) {
            assertThat(
                            segundo.getBean(ServicioAutenticacion.class)
                                    .iniciar("supervisor@ejemplo.invalid", CLAVE_FICTICIA)
                                    .isEmpty())
                    .isTrue();
            assertThat(
                            administrador.queryForObject(
                                    "SELECT intentos_fallidos FROM gestion.usuarios WHERE correo = 'supervisor@ejemplo.invalid'",
                                    Integer.class))
                    .isEqualTo(5);
            assertThat(
                            administrador.queryForObject(
                                    "SELECT count(*) FROM gestion.usuarios", Integer.class))
                    .isEqualTo(4);
            String hashDespues =
                    administrador.queryForObject(
                            "SELECT clave_hash FROM gestion.usuarios WHERE correo = 'solicitante@ejemplo.invalid'",
                            String.class);
            assertThat(hashAnterior.equals(hashDespues)).isTrue();
            assertThatThrownBy(() -> segundo.getBean(JwtDecoder.class).decode(accesoAnterior))
                    .isInstanceOf(JwtException.class);
            var renovado =
                    segundo.getBean(ServicioAutenticacion.class).renovar(refresh).orElseThrow();
            assertThat(
                            segundo.getBean(JwtDecoder.class)
                                    .decode(renovado.accessToken())
                                    .getSubject())
                    .isEqualTo(renovado.usuario().id().toString());
        }
    }

    @Test
    void perfilTestNoAprovisionaAunqueRecibaVariablesDemo() {
        try (var contexto = arrancar("test", demos())) {
            assertThat(contexto.getBeansOfType(AprovisionamientoLocal.class)).isEmpty();
            assertThat(
                            administrador.queryForObject(
                                    "SELECT count(*) FROM gestion.usuarios", Integer.class))
                    .isZero();
        }
    }

    @Test
    void perfilNormalSinClavesNoArranca() {
        assertThatThrownBy(
                        () -> {
                            try (var ignorado = arrancar("normal", Map.of())) {
                                throw new AssertionError("Normal exige claves externas");
                            }
                        })
                .isInstanceOf(org.springframework.beans.BeansException.class)
                .hasStackTraceContaining("Claves RSA externas ausentes o inválidas");
    }

    @Test
    void perfilNormalConClavesExternasNoAprovisionaNiPublicaSwagger() throws Exception {
        var entorno = new MockEnvironment();
        entorno.setActiveProfiles("test");
        var claves = ClavesRsa.cargar(entorno);
        var propiedades = demos();
        propiedades.put(
                "IDENTIDAD_CLAVE_PRIVADA_PEM", pem("PRIVATE KEY", claves.privada().getEncoded()));
        propiedades.put(
                "IDENTIDAD_CLAVE_PUBLICA_PEM", pem("PUBLIC KEY", claves.publica().getEncoded()));
        try (var contexto = arrancar("normal", propiedades);
                var cliente = HttpClient.newHttpClient()) {
            assertThat(contexto.getBeansOfType(AprovisionamientoLocal.class)).isEmpty();
            assertThat(
                            administrador.queryForObject(
                                    "SELECT count(*) FROM gestion.usuarios", Integer.class))
                    .isZero();
            String origen =
                    "http://127.0.0.1:"
                            + contexto.getEnvironment().getRequiredProperty("local.server.port");
            for (String ruta : new String[] {"/v3/api-docs", "/swagger-ui/index.html"}) {
                var respuesta =
                        cliente.send(
                                HttpRequest.newBuilder(URI.create(origen + ruta)).GET().build(),
                                HttpResponse.BodyHandlers.ofString());
                assertThat(respuesta.statusCode()).isEqualTo(401);
                assertThat(respuesta.body().equals("{\"error\":\"NO_AUTENTICADO\"}")).isTrue();
            }
        }
    }

    private String pem(String tipo, byte[] valor) {
        return "-----BEGIN "
                + tipo
                + "-----\n"
                + Base64.getMimeEncoder().encodeToString(valor)
                + "\n-----END "
                + tipo
                + "-----";
    }
}
