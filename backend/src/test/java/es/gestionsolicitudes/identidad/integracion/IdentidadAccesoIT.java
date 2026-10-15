package es.gestionsolicitudes.identidad.integracion;

import static org.assertj.core.api.Assertions.*;

import es.gestionsolicitudes.GestionSolicitudesApplication;
import es.gestionsolicitudes.identidad.aplicacion.*;
import es.gestionsolicitudes.identidad.dominio.*;
import es.gestionsolicitudes.integracion.ContenedoresPrueba;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class IdentidadAccesoIT {
    private static final String IMAGEN =
            "postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826";
    private static final Instant INICIO = Instant.parse("2026-10-14T00:00:00Z");
    private static final String CORREO = "cuenta@ejemplo.invalid";
    private static final String CLAVE = "  frase ficticia de integración 🔐  ";
    private final JsonMapper json = JsonMapper.builder().build();
    private PostgreSQLContainer base;
    private ConfigurableApplicationContext contexto;
    private HttpClient cliente;
    private JdbcTemplate administrador;
    private RepositorioIdentidad repositorio;
    private ServicioAutenticacion servicio;
    private RelojMutable reloj;
    private UUID usuarioId;
    private String hashPrueba;
    private String origen;

    @TestConfiguration(proxyBeanMethods = false)
    static class ComponentesPrueba {
        @Bean
        @Primary
        RelojMutable relojPrueba() {
            return new RelojMutable();
        }

        @Bean
        ComponenteRoles componenteRoles() {
            return new ComponenteRoles();
        }
    }

    static class RelojMutable extends Clock {
        private final AtomicReference<Instant> instante = new AtomicReference<>(INICIO);

        void fijar(Instant valor) {
            instante.set(valor);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zona) {
            return Clock.fixed(instant(), zona);
        }

        @Override
        public Instant instant() {
            return instante.get();
        }
    }

    static class ComponenteRoles {
        @PreAuthorize("hasRole('ADMINISTRADOR')")
        public String administrar() {
            return "permitido";
        }

        @PreAuthorize("hasRole('SOLICITANTE')")
        public String solicitar() {
            return "permitido";
        }
    }

    @BeforeAll
    void arrancar() {
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
        contexto =
                new SpringApplicationBuilder(
                                GestionSolicitudesApplication.class, ComponentesPrueba.class)
                        .profiles("test")
                        .properties(
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
                                        "off"))
                        .run("--server.port=0");
        origen =
                "http://127.0.0.1:"
                        + contexto.getEnvironment().getRequiredProperty("local.server.port");
        repositorio = contexto.getBean(RepositorioIdentidad.class);
        servicio = contexto.getBean(ServicioAutenticacion.class);
        reloj = contexto.getBean(RelojMutable.class);
        hashPrueba = contexto.getBean(Contrasenas.class).codificar(CLAVE);
        cliente = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    }

    @BeforeEach
    void preparar() {
        reloj.fijar(INICIO);
        administrador.execute(
                "TRUNCATE gestion.usuarios, gestion.usuarios_roles, gestion.sesiones_acceso, gestion.tokens_refresco CASCADE");
        usuarioId = UUID.randomUUID();
        new TransactionTemplate(contexto.getBean(PlatformTransactionManager.class))
                .executeWithoutResult(
                        estado ->
                                repositorio.crearUsuario(
                                        usuarioId,
                                        CORREO,
                                        "Cuenta ficticia",
                                        hashPrueba,
                                        Set.of(Rol.SOLICITANTE, Rol.AUDITOR),
                                        INICIO));
    }

    @AfterAll
    void terminar() {
        if (cliente != null) cliente.close();
        if (contexto != null) contexto.close();
        if (base != null) base.stop();
    }

    @Test
    void usuariosRolesUnicidadRestriccionesYPermisosPostgres() {
        assertThat(administrador.queryForList("SELECT nombre FROM gestion.roles", String.class))
                .containsExactlyInAnyOrder("SOLICITANTE", "SUPERVISOR", "AUDITOR", "ADMINISTRADOR");
        var usuario = repositorio.buscarUsuario(CORREO, false).orElseThrow();
        assertThat(usuario.publico().roles())
                .containsExactlyInAnyOrder(Rol.SOLICITANTE, Rol.AUDITOR);
        assertThat(usuario.claveHash().equals(CLAVE)).isFalse();
        assertThat(usuario.claveHash().startsWith("$argon2id$")).isTrue();
        var transaccion =
                new TransactionTemplate(contexto.getBean(PlatformTransactionManager.class));
        assertThatThrownBy(
                        () ->
                                transaccion.executeWithoutResult(
                                        estado ->
                                                repositorio.crearUsuario(
                                                        UUID.randomUUID(),
                                                        CORREO,
                                                        "Duplicada",
                                                        hashPrueba,
                                                        Set.of(Rol.SUPERVISOR),
                                                        INICIO)))
                .isInstanceOf(org.springframework.dao.DuplicateKeyException.class);
        assertThatThrownBy(
                        () ->
                                administrador.update(
                                        "UPDATE gestion.usuarios SET correo = ? WHERE id = ?",
                                        "Mayusculas@ejemplo.invalid",
                                        usuarioId))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(
                        () ->
                                administrador.update(
                                        "INSERT INTO gestion.usuarios_roles(usuario_id, rol) VALUES (?, ?)",
                                        usuarioId,
                                        "DESCONOCIDO"))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        var aplicacion = contexto.getBean(JdbcTemplate.class);
        assertThatThrownBy(
                        () ->
                                aplicacion.update(
                                        "INSERT INTO gestion.roles(nombre) VALUES ('OTRO')"))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThatThrownBy(
                        () ->
                                aplicacion.update(
                                        "DELETE FROM gestion.usuarios WHERE id = ?", usuarioId))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThat(
                        administrador.queryForObject(
                                "SELECT count(*) FROM gestion.usuarios", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void csrfLoginYoContratoMinimoCookiesYNoCache() throws Exception {
        var csrf = get("/api/autenticacion/csrf", null);
        assertThat(csrf.statusCode()).isEqualTo(204);
        assertThat(csrf.body()).isEmpty();
        String cabeceraCsrf = cookieCabecera(csrf, "XSRF-TOKEN");
        assertThat(cabeceraCsrf.contains("Secure")).isTrue();
        assertThat(cabeceraCsrf.contains("HttpOnly")).isFalse();
        assertThat(cabeceraCsrf.contains("Path=/;")).isTrue();
        assertThat(cabeceraCsrf.contains("SameSite=Strict")).isTrue();
        String xsrf = cookieValor(csrf, "XSRF-TOKEN");
        var respuesta = login("  CUENTA@EJEMPLO.INVALID ", CLAVE, xsrf);
        assertThat(respuesta.statusCode()).isEqualTo(200);
        noCache(respuesta);
        JsonNode cuerpo = json.readTree(respuesta.body());
        assertThat(cuerpo.propertyNames())
                .containsExactlyInAnyOrder("accessToken", "tipoToken", "expiraEn", "usuario");
        assertThat(cuerpo.path("tipoToken").asString()).isEqualTo("Bearer");
        assertThat(cuerpo.path("expiraEn").asInt()).isEqualTo(600);
        String cookie = cookieCabecera(respuesta, "REFRESH-TOKEN");
        for (String atributo :
                List.of(
                        "HttpOnly",
                        "Secure",
                        "Path=/api/autenticacion",
                        "SameSite=Strict",
                        "Max-Age=28800")) {
            assertThat(cookie.contains(atributo)).as("atributo %s", atributo).isTrue();
        }
        assertThat(cookie.contains("Domain=")).isFalse();
        String token = cuerpo.path("accessToken").asString();
        var yo = get("/api/identidad/yo", token);
        assertThat(yo.statusCode()).isEqualTo(200);
        noCache(yo);
        JsonNode identidad = json.readTree(yo.body());
        assertThat(identidad.propertyNames())
                .containsExactlyInAnyOrder("id", "correo", "nombreVisible", "roles");
        assertThat(identidad.path("id").asString()).isEqualTo(usuarioId.toString());
        assertThat(identidad.path("correo").asString()).isEqualTo(CORREO);
        assertThat(identidad.path("roles").size()).isEqualTo(2);
        assertThat(respuesta.body().contains(cookieValor(respuesta, "REFRESH-TOKEN"))).isFalse();
        assertThat(respuesta.body().contains(hashPrueba)).isFalse();
    }

    @Test
    void losErroresSqlDeAplicacionNoIncluyenHashesDeFilas() throws InterruptedException {
        for (var propiedad :
                Map.of(
                                "log_error_verbosity",
                                "terse",
                                "log_min_error_statement",
                                "panic",
                                "log_parameter_max_length_on_error",
                                "0",
                                "log_statement",
                                "none",
                                "log_min_duration_statement",
                                "-1",
                                "log_min_duration_sample",
                                "-1")
                        .entrySet()) {
            String observado =
                    administrador.queryForObject(
                            "SELECT current_setting(?)", String.class, propiedad.getKey());
            assertThat(observado).as(propiedad.getKey()).isEqualTo(propiedad.getValue());
        }
        assertThat(administrador.queryForObject("SHOW log_line_prefix", String.class))
                .isEqualTo("%m [%p] %e ");
        int inicioLogs = base.getLogs().length();
        try {
            contexto.getBean(JdbcTemplate.class)
                    .update(
                            "UPDATE gestion.usuarios SET correo = ? WHERE id = ?",
                            "MAYUSCULAS@ejemplo.invalid",
                            usuarioId);
            fail("La restricción debe rechazar correo no normalizado");
        } catch (org.springframework.dao.DataIntegrityViolationException error) {
            assertThat(error.getMessage().contains(hashPrueba)).isFalse();
            assertThat(error.getMessage().contains("Failing row contains")).isFalse();
            assertThat(((SQLException) error.getRootCause()).getSQLState()).isEqualTo("23514");
        }
        long limite = System.nanoTime() + TimeUnit.SECONDS.toNanos(3);
        String ventana = "";
        while (System.nanoTime() < limite) {
            String logs = base.getLogs();
            ventana = logs.substring(Math.min(inicioLogs, logs.length()));
            if (ventana.contains("23514")) break;
            Thread.sleep(20);
        }
        assertThat(ventana.contains("23514")).as("SQLSTATE conservado en log técnico").isTrue();
        assertThat(ventana.contains("ERROR:")).as("tipo de error conservado").isTrue();
        assertThat(ventana.contains(hashPrueba)).as("hash ausente en log PostgreSQL").isFalse();
        assertThat(ventana.contains("DETAIL:")).isFalse();
        assertThat(ventana.contains("STATEMENT:")).isFalse();
        assertThat(ventana.contains("UPDATE gestion.usuarios")).isFalse();
        assertThat(ventana.contains("MAYUSCULAS@ejemplo.invalid")).isFalse();
    }

    @Test
    void loginNoEnumeraCuentasIncorrectasDeshabilitadasNiBloqueadas() throws Exception {
        String csrf = csrf();
        for (var respuesta :
                List.of(
                        login("ausente@ejemplo.invalid", CLAVE, csrf),
                        login(CORREO, "incorrecta de prueba", csrf))) {
            error(respuesta, 401, "CREDENCIALES_INVALIDAS");
        }
        administrador.update(
                "UPDATE gestion.usuarios SET habilitado = false WHERE id = ?", usuarioId);
        error(login(CORREO, CLAVE, csrf), 401, "CREDENCIALES_INVALIDAS");
        administrador.update(
                "UPDATE gestion.usuarios SET habilitado = true WHERE id = ?", usuarioId);
        for (int n = 1; n < 5; n++)
            error(login(CORREO, "incorrecta de prueba", csrf), 401, "CREDENCIALES_INVALIDAS");
        error(login(CORREO, CLAVE, csrf), 401, "CREDENCIALES_INVALIDAS");
        var intentos = repositorio.buscarUsuario(CORREO, false).orElseThrow().intentos();
        assertThat(intentos.fallos()).isEqualTo(5);
        assertThat(intentos.bloqueadoHasta()).isEqualTo(INICIO.plusSeconds(900));
    }

    @Test
    void intentosPersistenVentanaCaducaYUnExitoRestablece() {
        for (int n = 0; n < 4; n++)
            assertThat(servicio.iniciar(CORREO, "incorrecta de prueba").isEmpty()).isTrue();
        assertThat(
                        administrador.queryForObject(
                                "SELECT intentos_fallidos FROM gestion.usuarios WHERE id = ?",
                                Integer.class,
                                usuarioId))
                .isEqualTo(4);
        reloj.fijar(INICIO.plusSeconds(900));
        servicio.iniciar(CORREO, "incorrecta de prueba");
        assertThat(repositorio.buscarUsuario(CORREO, false).orElseThrow().intentos().fallos())
                .isEqualTo(1);
        assertThat(servicio.iniciar(CORREO, CLAVE).isPresent()).isTrue();
        assertThat(repositorio.buscarUsuario(CORREO, false).orElseThrow().intentos())
                .isEqualTo(IntentosAcceso.vacios());
        for (int n = 0; n < 5; n++) servicio.iniciar(CORREO, "incorrecta de prueba");
        reloj.fijar(INICIO.plusSeconds(1799));
        assertThat(servicio.iniciar(CORREO, CLAVE).isEmpty()).isTrue();
        reloj.fijar(INICIO.plusSeconds(1800));
        assertThat(servicio.iniciar(CORREO, CLAVE).isPresent()).isTrue();
        assertThat(repositorio.buscarUsuario(CORREO, false).orElseThrow().intentos())
                .isEqualTo(IntentosAcceso.vacios());
    }

    @Test
    void csrfSeExigeEnCadaPostInclusoConBearerValido() throws Exception {
        var acceso = servicio.iniciar(CORREO, CLAVE).orElseThrow();
        String xsrf = csrf();
        String cuerpo = json.writeValueAsString(Map.of("correo", CORREO, "contrasena", CLAVE));
        for (String ruta : List.of("iniciar-sesion", "renovar", "cerrar-sesion")) {
            error(
                    post("/api/autenticacion/" + ruta, cuerpo, null, null, acceso.refresh(), null),
                    403,
                    "ACCESO_NO_PERMITIDO");
            error(
                    post(
                            "/api/autenticacion/" + ruta,
                            cuerpo,
                            xsrf,
                            "incorrecto",
                            acceso.refresh(),
                            null),
                    403,
                    "ACCESO_NO_PERMITIDO");
            error(
                    post(
                            "/api/autenticacion/" + ruta,
                            cuerpo,
                            null,
                            null,
                            acceso.refresh(),
                            acceso.accessToken()),
                    403,
                    "ACCESO_NO_PERMITIDO");
        }
        assertThat(get("/api/identidad/yo", acceso.accessToken()).statusCode()).isEqualTo(200);
        error(
                post("/api/autenticacion/renovar", "", xsrf, xsrf, null, null),
                401,
                "NO_AUTENTICADO");
        error(
                post("/api/autenticacion/renovar", "", xsrf, xsrf, "malformado", null),
                401,
                "NO_AUTENTICADO");
    }

    @Test
    void bearerAusenteAlteradoCaducadoYUsuarioDeshabilitadoSeRechazan() throws Exception {
        var acceso = servicio.iniciar(CORREO, CLAVE).orElseThrow();
        error(get("/api/identidad/yo", null), 401, "NO_AUTENTICADO");
        int firma = acceso.accessToken().lastIndexOf('.') + 1;
        String token = acceso.accessToken();
        String alterado =
                token.substring(0, firma)
                        + (token.charAt(firma) == 'A' ? 'B' : 'A')
                        + token.substring(firma + 1);
        error(get("/api/identidad/yo", alterado), 401, "NO_AUTENTICADO");
        administrador.update(
                "UPDATE gestion.usuarios SET habilitado = false WHERE id = ?", usuarioId);
        error(get("/api/identidad/yo", token), 401, "NO_AUTENTICADO");
        administrador.update(
                "UPDATE gestion.usuarios SET habilitado = true WHERE id = ?", usuarioId);
        reloj.fijar(INICIO.plusSeconds(600));
        error(get("/api/identidad/yo", token), 401, "NO_AUTENTICADO");
        String csrf = csrf();
        var renovacion = post("/api/autenticacion/renovar", "", csrf, csrf, acceso.refresh(), null);
        assertThat(renovacion.statusCode()).isEqualTo(200);
        assertThat(
                        get(
                                        "/api/identidad/yo",
                                        json.readTree(renovacion.body())
                                                .path("accessToken")
                                                .asString())
                                .statusCode())
                .isEqualTo(200);
    }

    @Test
    void refreshRotaYReutilizacionConfirmaRevocacionAunqueDevuelva401() throws Exception {
        String csrf = csrf();
        var acceso = servicio.iniciar(CORREO, CLAVE).orElseThrow();
        reloj.fijar(INICIO.plusSeconds(60));
        var renovacion = post("/api/autenticacion/renovar", "", csrf, csrf, acceso.refresh(), null);
        assertThat(renovacion.statusCode()).isEqualTo(200);
        String nuevoRefresh = cookieValor(renovacion, "REFRESH-TOKEN");
        String nuevoAcceso = json.readTree(renovacion.body()).path("accessToken").asString();
        assertThat(nuevoRefresh.equals(acceso.refresh())).isFalse();
        assertThat(cookieCabecera(renovacion, "REFRESH-TOKEN").contains("Max-Age=28740")).isTrue();
        assertThat(
                        administrador.queryForObject(
                                "SELECT count(*) FROM gestion.tokens_refresco WHERE estado = 'USADO' AND usado_en IS NOT NULL AND reemplazo_id IS NOT NULL",
                                Integer.class))
                .isEqualTo(1);
        assertThat(
                        administrador.queryForObject(
                                "SELECT count(*) FROM gestion.tokens_refresco WHERE octet_length(secreto_hash) = 32",
                                Integer.class))
                .isEqualTo(2);
        var reutilizacion =
                post("/api/autenticacion/renovar", "", csrf, csrf, acceso.refresh(), null);
        error(reutilizacion, 401, "NO_AUTENTICADO");
        assertThat(cookieCabecera(reutilizacion, "REFRESH-TOKEN").contains("Max-Age=0")).isTrue();
        assertThat(
                        administrador.queryForObject(
                                "SELECT count(*) FROM gestion.sesiones_acceso WHERE revocado_en IS NOT NULL AND motivo_revocacion = 'REUTILIZACION'",
                                Integer.class))
                .isEqualTo(1);
        assertThat(
                        administrador.queryForObject(
                                "SELECT count(*) FROM gestion.tokens_refresco WHERE estado = 'REVOCADO'",
                                Integer.class))
                .isEqualTo(2);
        error(get("/api/identidad/yo", nuevoAcceso), 401, "NO_AUTENTICADO");
        error(get("/api/identidad/yo", acceso.accessToken()), 401, "NO_AUTENTICADO");
        error(
                post("/api/autenticacion/renovar", "", csrf, csrf, nuevoRefresh, null),
                401,
                "NO_AUTENTICADO");
    }

    @Test
    void refreshCaducaAbsolutamenteSinAmpliarseYHashIncorrectoNoRevoca() {
        var acceso = servicio.iniciar(CORREO, CLAVE).orElseThrow();
        String falso = acceso.refresh().substring(0, 37) + "A".repeat(43);
        assertThat(servicio.renovar(falso).isEmpty()).isTrue();
        assertThat(
                        administrador.queryForObject(
                                "SELECT count(*) FROM gestion.sesiones_acceso WHERE revocado_en IS NULL",
                                Integer.class))
                .isEqualTo(1);
        reloj.fijar(INICIO.plusSeconds(28799));
        var ultimo = servicio.renovar(acceso.refresh()).orElseThrow();
        assertThat(ultimo.expiraRefresh()).isEqualTo(INICIO.plusSeconds(28800));
        assertThat(ultimo.expiraEn()).isEqualTo(1);
        reloj.fijar(INICIO.plusSeconds(28800));
        assertThat(servicio.renovar(ultimo.refresh()).isEmpty()).isTrue();
        assertThatThrownBy(() -> contexto.getBean(JwtDecoder.class).decode(ultimo.accessToken()))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void logoutAutenticaRefreshRevocaSesionCompletaBorraCookieYEsIdempotente() throws Exception {
        String csrf = csrf();
        var acceso = servicio.iniciar(CORREO, CLAVE).orElseThrow();
        String falso = acceso.refresh().substring(0, 37) + "A".repeat(43);
        var falsoCierre = post("/api/autenticacion/cerrar-sesion", "", csrf, csrf, falso, null);
        assertThat(falsoCierre.statusCode()).isEqualTo(204);
        assertThat(get("/api/identidad/yo", acceso.accessToken()).statusCode()).isEqualTo(200);
        var rotado = servicio.renovar(acceso.refresh()).orElseThrow();
        // Un refresh anterior auténtico también identifica la sesión que hay que cerrar.
        var cierre =
                post("/api/autenticacion/cerrar-sesion", "", csrf, csrf, acceso.refresh(), null);
        assertThat(cierre.statusCode()).isEqualTo(204);
        assertThat(cierre.body()).isEmpty();
        assertThat(cierre.headers().firstValue("Clear-Site-Data")).hasValue("\"cache\"");
        assertThat(cookieCabecera(cierre, "REFRESH-TOKEN").contains("Max-Age=0")).isTrue();
        noCache(cierre);
        error(get("/api/identidad/yo", acceso.accessToken()), 401, "NO_AUTENTICADO");
        error(get("/api/identidad/yo", rotado.accessToken()), 401, "NO_AUTENTICADO");
        assertThat(servicio.renovar(rotado.refresh()).isEmpty()).isTrue();
        assertThat(
                        post("/api/autenticacion/cerrar-sesion", "", csrf, csrf, null, null)
                                .statusCode())
                .isEqualTo(204);
        assertThat(
                        post(
                                        "/api/autenticacion/cerrar-sesion",
                                        "",
                                        csrf,
                                        csrf,
                                        acceso.refresh(),
                                        null)
                                .statusCode())
                .isEqualTo(204);
    }

    @Test
    void dosRenovacionesConcurrentesEsperanElMismoBloqueoYRevocanElResultadoGanador()
            throws Exception {
        var acceso = servicio.iniciar(CORREO, CLAVE).orElseThrow();
        try (var bloqueo = bloquearSesion();
                var hilos = Executors.newFixedThreadPool(2)) {
            CountDownLatch inicio = new CountDownLatch(1);
            var primera =
                    hilos.submit(
                            () -> {
                                inicio.await();
                                return servicio.renovar(acceso.refresh());
                            });
            var segunda =
                    hilos.submit(
                            () -> {
                                inicio.await();
                                return servicio.renovar(acceso.refresh());
                            });
            inicio.countDown();
            try {
                esperarDosBloqueos();
            } finally {
                bloqueo.commit();
            }
            var resultados =
                    List.of(primera.get(10, TimeUnit.SECONDS), segunda.get(10, TimeUnit.SECONDS));
            assertThat(resultados.stream().filter(java.util.Optional::isPresent).count())
                    .isEqualTo(1);
            var ganador =
                    resultados.stream()
                            .flatMap(java.util.Optional::stream)
                            .findFirst()
                            .orElseThrow();
            assertThatThrownBy(
                            () -> contexto.getBean(JwtDecoder.class).decode(ganador.accessToken()))
                    .isInstanceOf(JwtException.class);
            assertThat(servicio.renovar(ganador.refresh()).isEmpty()).isTrue();
            assertThat(
                            administrador.queryForObject(
                                    "SELECT count(*) FROM gestion.tokens_refresco", Integer.class))
                    .isEqualTo(2);
            assertThat(
                            administrador.queryForObject(
                                    "SELECT motivo_revocacion FROM gestion.sesiones_acceso",
                                    String.class))
                    .isEqualTo("REUTILIZACION");
        }
    }

    @Test
    void carreraRefreshLogoutSiempreTerminaConSesionRevocada() throws Exception {
        var acceso = servicio.iniciar(CORREO, CLAVE).orElseThrow();
        try (var bloqueo = bloquearSesion();
                var hilos = Executors.newFixedThreadPool(2)) {
            CountDownLatch inicio = new CountDownLatch(1);
            var renovar =
                    hilos.submit(
                            () -> {
                                inicio.await();
                                return servicio.renovar(acceso.refresh());
                            });
            var cerrar =
                    hilos.submit(
                            () -> {
                                inicio.await();
                                servicio.cerrar(acceso.refresh());
                                return true;
                            });
            inicio.countDown();
            try {
                esperarDosBloqueos();
            } finally {
                bloqueo.commit();
            }
            var nuevo = renovar.get(10, TimeUnit.SECONDS);
            assertThat(cerrar.get(10, TimeUnit.SECONDS)).isTrue();
            assertThat(
                            administrador.queryForObject(
                                    "SELECT count(*) FROM gestion.sesiones_acceso WHERE revocado_en IS NOT NULL",
                                    Integer.class))
                    .isEqualTo(1);
            assertThatThrownBy(
                            () -> contexto.getBean(JwtDecoder.class).decode(acceso.accessToken()))
                    .isInstanceOf(JwtException.class);
            if (nuevo.isPresent()) {
                assertThat(servicio.renovar(nuevo.get().refresh()).isEmpty()).isTrue();
                assertThatThrownBy(
                                () ->
                                        contexto.getBean(JwtDecoder.class)
                                                .decode(nuevo.get().accessToken()))
                        .isInstanceOf(JwtException.class);
            }
        }
    }

    @Test
    void denegacionPorDefectoYMethodSecurityUsanRolesDeJwt() throws Exception {
        var acceso = servicio.iniciar(CORREO, CLAVE).orElseThrow();
        error(get("/api/proveedores", null), 401, "NO_AUTENTICADO");
        assertThat(get("/api/proveedores", acceso.accessToken()).statusCode()).isEqualTo(200);
        error(get("/api/ruta-no-autorizada", acceso.accessToken()), 403, "ACCESO_NO_PERMITIDO");
        var token = contexto.getBean(JwtDecoder.class).decode(acceso.accessToken());
        var autenticacion =
                es.gestionsolicitudes.configuracion.SeguridadTecnica.conversorJwt().convert(token);
        SecurityContextHolder.getContext().setAuthentication(autenticacion);
        try {
            var componente = contexto.getBean(ComponenteRoles.class);
            assertThat(componente.solicitar()).isEqualTo("permitido");
            assertThatThrownBy(componente::administrar).isInstanceOf(AccessDeniedException.class);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private Connection bloquearSesion() throws SQLException {
        Connection conexion =
                DriverManager.getConnection(
                        base.getJdbcUrl(), base.getUsername(), base.getPassword());
        conexion.setAutoCommit(false);
        try (var sentencia = conexion.createStatement()) {
            sentencia.executeQuery("SELECT id FROM gestion.sesiones_acceso FOR UPDATE").close();
        }
        return conexion;
    }

    private void esperarDosBloqueos() throws InterruptedException {
        long limite = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        int esperando = 0;
        while (System.nanoTime() < limite && esperando < 2) {
            esperando =
                    administrador.queryForObject(
                            "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND usename = 'gestion_app' AND wait_event_type = 'Lock' AND query LIKE '%sesiones_acceso%FOR UPDATE%'",
                            Integer.class);
            if (esperando < 2) Thread.sleep(20);
        }
        assertThat(esperando)
                .as("dos conexiones reales esperan el bloqueo de la sesión")
                .isEqualTo(2);
    }

    private HttpResponse<String> get(String ruta, String bearer) throws Exception {
        var peticion =
                HttpRequest.newBuilder(URI.create(origen + ruta))
                        .timeout(Duration.ofSeconds(10))
                        .GET();
        if (bearer != null) peticion.header("Authorization", "Bearer " + bearer);
        return cliente.send(peticion.build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(
            String ruta,
            String cuerpo,
            String cookieCsrf,
            String cabeceraCsrf,
            String refresh,
            String bearer)
            throws Exception {
        var peticion =
                HttpRequest.newBuilder(URI.create(origen + ruta))
                        .timeout(Duration.ofSeconds(10))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(cuerpo));
        String cookies =
                (cookieCsrf == null ? "" : "XSRF-TOKEN=" + cookieCsrf + "; ")
                        + (refresh == null ? "" : "REFRESH-TOKEN=" + refresh);
        if (!cookies.isEmpty()) peticion.header("Cookie", cookies);
        if (cabeceraCsrf != null) peticion.header("X-XSRF-TOKEN", cabeceraCsrf);
        if (bearer != null) peticion.header("Authorization", "Bearer " + bearer);
        return cliente.send(peticion.build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> login(String correo, String clave, String csrf) throws Exception {
        return post(
                "/api/autenticacion/iniciar-sesion",
                json.writeValueAsString(Map.of("correo", correo, "contrasena", clave)),
                csrf,
                csrf,
                null,
                null);
    }

    private String csrf() throws Exception {
        return cookieValor(get("/api/autenticacion/csrf", null), "XSRF-TOKEN");
    }

    private String cookieCabecera(HttpResponse<String> respuesta, String nombre) {
        return respuesta.headers().allValues("Set-Cookie").stream()
                .filter(valor -> valor.startsWith(nombre + "="))
                .findFirst()
                .orElseThrow();
    }

    private String cookieValor(HttpResponse<String> respuesta, String nombre) {
        return cookieCabecera(respuesta, nombre).split(";", 2)[0].substring(nombre.length() + 1);
    }

    private void error(HttpResponse<String> respuesta, int estado, String codigo) {
        assertThat(respuesta.statusCode()).isEqualTo(estado);
        // La respuesta de éxito podría contener credenciales si hubiera un defecto: no imprimirla.
        assertThat(respuesta.body().equals("{\"error\":\"" + codigo + "\"}"))
                .as("forma de error genérica")
                .isTrue();
        noCache(respuesta);
    }

    private void noCache(HttpResponse<String> respuesta) {
        assertThat(respuesta.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
        assertThat(respuesta.headers().firstValue("Pragma")).hasValue("no-cache");
    }
}
