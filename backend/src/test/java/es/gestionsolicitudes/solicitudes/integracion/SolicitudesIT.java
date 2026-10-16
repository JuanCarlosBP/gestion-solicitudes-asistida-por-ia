package es.gestionsolicitudes.solicitudes.integracion;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import es.gestionsolicitudes.GestionSolicitudesApplication;
import es.gestionsolicitudes.identidad.aplicacion.*;
import es.gestionsolicitudes.identidad.dominio.Rol;
import es.gestionsolicitudes.integracion.ContenedoresPrueba;
import es.gestionsolicitudes.proveedores.aplicacion.ServicioProveedores;
import es.gestionsolicitudes.proveedores.dominio.*;
import es.gestionsolicitudes.solicitudes.aplicacion.*;
import es.gestionsolicitudes.solicitudes.dominio.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.slf4j.LoggerFactory;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SolicitudesIT {
    private static final String IMAGEN =
            "postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826";
    private static final Instant AHORA = Instant.parse("2026-12-31T23:30:00.123456789Z");
    private static final String CLAVE = "clave ficticia solicitudes integración";
    private final JsonMapper json = JsonMapper.builder().build();
    private final Map<String, String> tokens = new HashMap<>();
    private final Map<String, ActorSolicitud> actores = new HashMap<>();
    private PostgreSQLContainer base;
    private ConfigurableApplicationContext contexto;
    private JdbcTemplate administrador;
    private HttpClient cliente;
    private ServicioSolicitudes servicio;
    private RepositorioSolicitudes repositorio;
    private String origen, csrf;
    private Logger logger;
    private ListAppender<ILoggingEvent> eventos;

    @TestConfiguration(proxyBeanMethods = false)
    static class Componentes {
        @Bean
        @Primary
        Clock relojSolicitudes() {
            return Clock.fixed(AHORA, ZoneOffset.UTC);
        }
    }

    @BeforeAll
    void arrancar() throws Exception {
        base =
                ContenedoresPrueba.postgres(
                                DockerImageName.parse(IMAGEN).asCompatibleSubstituteFor("postgres"))
                        .withDatabaseName("gestion")
                        .withUsername("administrador_prueba")
                        .withPassword("administracion-ficticia-prueba")
                        .withInitScript("postgres-inicial.sql")
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
                                "log_line_prefix=%m [%p] %e ");
        base.start();
        var fuente =
                new DriverManagerDataSource(
                        base.getJdbcUrl(), base.getUsername(), base.getPassword());
        var opciones = new Properties();
        opciones.setProperty("logServerErrorDetail", "false");
        fuente.setConnectionProperties(opciones);
        administrador = new JdbcTemplate(fuente);
        var anterior =
                Flyway.configure()
                        .dataSource(
                                base.getJdbcUrl(), "gestion_migracion", "migracion-ficticia-prueba")
                        .defaultSchema("gestion")
                        .schemas("gestion")
                        .createSchemas(false)
                        .target("3")
                        .load();
        assertThat(anterior.migrate().migrationsExecuted).isEqualTo(3);
        UUID legado = UUID.randomUUID();
        administrador.update(
                "INSERT INTO gestion.proveedores(id,tipo,denominacion,pais_fiscal,identificador_fiscal,identificador_fiscal_normalizado,creado_en,actualizado_en) VALUES (?,'PROFESIONAL','Legado ficticio','ES','LEG123','LEG123',?,?)",
                legado,
                Timestamp.from(AHORA),
                Timestamp.from(AHORA));
        contexto =
                new SpringApplicationBuilder(GestionSolicitudesApplication.class, Componentes.class)
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
        assertThat(contexto.getBean(Flyway.class).info().applied()).hasSize(7);
        assertThat(
                        administrador.queryForObject(
                                "SELECT count(*) FROM gestion.proveedores WHERE id=?",
                                Integer.class,
                                legado))
                .isEqualTo(1);
        assertThat(contexto.getBean(Flyway.class).migrate().migrationsExecuted).isZero();
        origen =
                "http://127.0.0.1:"
                        + contexto.getEnvironment().getRequiredProperty("local.server.port");
        cliente = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        servicio = contexto.getBean(ServicioSolicitudes.class);
        repositorio = contexto.getBean(RepositorioSolicitudes.class);
        String hash = contexto.getBean(Contrasenas.class).codificar(CLAVE);
        for (Rol rol : Rol.values()) usuario(rol.name(), Set.of(rol), hash);
        usuario("AJENO", Set.of(Rol.SOLICITANTE), hash);
        usuario("MULTI", Set.of(Rol.SOLICITANTE, Rol.SUPERVISOR), hash);
        usuario("ADMIN_SOL", Set.of(Rol.SOLICITANTE, Rol.ADMINISTRADOR), hash);
        usuario("AUD_SOL", Set.of(Rol.SOLICITANTE, Rol.AUDITOR), hash);
        csrf =
                enviar("GET", "/api/autenticacion/csrf", null, null, false, null)
                        .headers()
                        .allValues("Set-Cookie")
                        .stream()
                        .filter(c -> c.startsWith("XSRF-TOKEN="))
                        .findFirst()
                        .orElseThrow()
                        .split(";", 2)[0]
                        .substring(11);
        logger = (Logger) LoggerFactory.getLogger(ServicioSolicitudes.class);
        eventos = new ListAppender<>();
        eventos.start();
        logger.addAppender(eventos);
    }

    private void usuario(String nombre, Set<Rol> roles, String hash) {
        UUID id = UUID.randomUUID();
        String correo = nombre.toLowerCase(Locale.ROOT) + "@ejemplo.invalid";
        new TransactionTemplate(contexto.getBean(PlatformTransactionManager.class))
                .executeWithoutResult(
                        tx ->
                                contexto.getBean(RepositorioIdentidad.class)
                                        .crearUsuario(
                                                id,
                                                correo,
                                                "Cuenta ficticia " + nombre,
                                                hash,
                                                roles,
                                                AHORA.minusSeconds(1)));
        tokens.put(
                nombre,
                contexto.getBean(ServicioAutenticacion.class)
                        .iniciar(correo, CLAVE)
                        .orElseThrow()
                        .accessToken());
        actores.put(nombre, new ActorSolicitud(id, roles));
    }

    @BeforeEach
    void limpiar() {
        administrador.execute(
                "TRUNCATE gestion.eventos_historial,gestion.decisiones_solicitud,gestion.operaciones_idempotentes_solicitud,gestion.conceptos_solicitud,gestion.solicitudes,gestion.proveedores");
        administrador.execute("ALTER SEQUENCE gestion.numero_solicitud_seq RESTART WITH 1");
        administrador.execute("UPDATE gestion.usuarios SET habilitado=true");
        actores.forEach(
                (nombre, actor) ->
                        actor.roles()
                                .forEach(
                                        rol ->
                                                administrador.update(
                                                        "INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES (?,?) ON CONFLICT DO NOTHING",
                                                        actor.id(),
                                                        rol.name())));
        eventos.list.clear();
    }

    @AfterAll
    void cerrar() {
        if (logger != null) logger.detachAppender(eventos);
        if (eventos != null) eventos.stop();
        if (cliente != null) cliente.close();
        if (contexto != null) contexto.close();
        if (base != null) base.stop();
    }

    @Test
    void crearDetalleNumeroServidorFechasUnicodeYContrato() throws Exception {
        var respuesta =
                enviar(
                        "POST",
                        "/api/solicitudes",
                        "{\"asunto\":\"  😀😀😀  \"}",
                        "SOLICITANTE",
                        true,
                        null);
        assertThat(respuesta.statusCode()).isEqualTo(201);
        noCache(respuesta);
        var s = json.readTree(respuesta.body());
        UUID id = UUID.fromString(s.path("id").asString());
        assertThat(respuesta.headers().firstValue("Location")).hasValue("/api/solicitudes/" + id);
        assertThat(s.propertyNames())
                .containsExactlyInAnyOrder(
                        "id",
                        "numero",
                        "autor",
                        "asunto",
                        "descripcion",
                        "proveedorId",
                        "proveedor",
                        "supervisorId",
                        "supervisor",
                        "moneda",
                        "estado",
                        "importeTotal",
                        "version",
                        "creadoEn",
                        "actualizadoEn",
                        "presentadoEn",
                        "conceptos",
                        "decididoEn",
                        "decision");
        assertThat(s.path("asunto").asString()).isEqualTo("😀😀😀");
        assertThat(s.path("numero").asString()).isEqualTo("SOL-2027-000001");
        assertThat(s.path("autor").path("id").asString())
                .isEqualTo(actores.get("SOLICITANTE").id().toString());
        assertThat(s.path("version").asLong()).isZero();
        assertThat(s.path("importeTotal").asString()).isEqualTo("0.00");
        assertThat(s.path("creadoEn").asString()).isEqualTo("2026-12-31T23:30:00.123456Z");
        assertThat(s.path("conceptos").isArray()).isTrue();
        assertThat(s.path("conceptos").size()).isZero();
        assertThat(detalle(id, "SOLICITANTE")).isEqualTo(s);
    }

    @Test
    void altaYEdicionRechazanAsignacionMasivaTiposYCamposDesconocidos() throws Exception {
        for (String campo :
                List.of(
                        "id",
                        "numero",
                        "autor",
                        "estado",
                        "importeTotal",
                        "version",
                        "creadoEn",
                        "proveedorId",
                        "roles"))
            error(
                    enviar(
                            "POST",
                            "/api/solicitudes",
                            "{\"asunto\":\"Asunto\",\"" + campo + "\":\"NO-REFLEJAR\"}",
                            "SOLICITANTE",
                            true,
                            null),
                    400,
                    "SOLICITUD_INVALIDA");
        for (String cuerpo :
                List.of(
                        "null",
                        "[]",
                        "{}",
                        "{",
                        "{\"asunto\":12}",
                        "{\"asunto\":\"abc\\ud800\"}",
                        "{\"asunto\":\"abc\\udc00\"}",
                        "{\"asunto\":\"ab\"}",
                        "{\"asunto\":\"" + "x".repeat(161) + "\"}"))
            error(
                    enviar("POST", "/api/solicitudes", cuerpo, "SOLICITANTE", true, null),
                    400,
                    "SOLICITUD_INVALIDA");
        assertThat(cuenta("solicitudes")).isZero();
        var s = crear("SOLICITANTE", "Asunto");
        var entrada = edicion(s, List.of(linea(null, "1", "10.0000", 1)), null, null);
        ((ObjectNode) entrada.path("conceptos").get(0)).put("importeLinea", "100.00");
        error(
                enviar(
                        "PUT",
                        "/api/solicitudes/" + s.id(),
                        entrada.toString(),
                        "SOLICITANTE",
                        true,
                        null),
                400,
                "SOLICITUD_INVALIDA");
        assertThat(servicio.consultar(actores.get("SOLICITANTE"), s.id()).version()).isZero();
        entrada = edicion(s, List.of(linea(null, "1", "10.0000", 1)), null, null);
        ((ObjectNode) entrada.path("conceptos").get(0)).put("cantidad", 1);
        error(
                enviar(
                        "PUT",
                        "/api/solicitudes/" + s.id(),
                        entrada.toString(),
                        "SOLICITANTE",
                        true,
                        null),
                400,
                "SOLICITUD_INVALIDA");
    }

    @Test
    void permisosHttpCsrfYNoVisibilidad404() throws Exception {
        var propio = crear("SOLICITANTE", "Privado");
        UUID otro = UUID.randomUUID();
        error(enviar("GET", "/api/solicitudes", null, null, false, null), 401, "NO_AUTENTICADO");
        for (String rol : List.of("SUPERVISOR", "AUDITOR", "ADMINISTRADOR"))
            error(
                    enviar("POST", "/api/solicitudes", "{\"asunto\":\"Asunto\"}", rol, true, null),
                    403,
                    "ACCESO_NO_PERMITIDO");
        error(
                enviar(
                        "POST",
                        "/api/solicitudes",
                        "{\"asunto\":\"Asunto\"}",
                        "SOLICITANTE",
                        false,
                        null),
                403,
                "ACCESO_NO_PERMITIDO");
        for (String rol : List.of("AJENO", "SUPERVISOR"))
            error(
                    enviar("GET", "/api/solicitudes/" + propio.id(), null, rol, false, null),
                    404,
                    "SOLICITUD_NO_ENCONTRADA");
        error(
                enviar("GET", "/api/solicitudes/" + otro, null, "AUDITOR", false, null),
                404,
                "SOLICITUD_NO_ENCONTRADA");
        for (String rol : List.of("AUDITOR", "ADMINISTRADOR"))
            assertThat(
                            enviar("GET", "/api/solicitudes/" + propio.id(), null, rol, false, null)
                                    .statusCode())
                    .isEqualTo(200);
        error(
                enviar(
                        "PUT",
                        "/api/solicitudes/" + propio.id(),
                        edicion(propio, List.of(), null, null).toString(),
                        "AJENO",
                        true,
                        null),
                404,
                "SOLICITUD_NO_ENCONTRADA");
        error(
                enviar(
                        "PUT",
                        "/api/solicitudes/" + propio.id(),
                        edicion(propio, List.of(), null, null).toString(),
                        "ADMIN_SOL",
                        true,
                        null),
                403,
                "ACCESO_NO_PERMITIDO");
        error(
                enviar(
                        "PUT",
                        "/api/solicitudes/" + propio.id(),
                        edicion(propio, List.of(), null, null).toString(),
                        "SOLICITANTE",
                        false,
                        null),
                403,
                "ACCESO_NO_PERMITIDO");
        error(
                enviar(
                        "POST",
                        "/api/solicitudes/" + propio.id() + "/presentar",
                        "{\"version\":0}",
                        "SOLICITANTE",
                        false,
                        UUID.randomUUID().toString()),
                403,
                "ACCESO_NO_PERMITIDO");
    }

    @Test
    void reemplazoAtomicoConceptosImportesYFechasCrecientes() throws Exception {
        var s = crear("SOLICITANTE", "Asunto original");
        var entrada =
                edicion(
                        s,
                        List.of(
                                linea(null, "1", "10.0000", 7),
                                linea(null, "2.500", "4.1250", 2),
                                linea(null, "3", "0.3350", 9)),
                        null,
                        null);
        entrada.put("asunto", "Asunto editado");
        entrada.put("descripcion", "Descripción ficticia");
        var respuesta =
                enviar(
                        "PUT",
                        "/api/solicitudes/" + s.id(),
                        entrada.toString(),
                        "SOLICITANTE",
                        true,
                        null);
        assertThat(respuesta.statusCode()).isEqualTo(200);
        var nuevo = json.readTree(respuesta.body());
        assertThat(nuevo.path("importeTotal").asString()).isEqualTo("21.32");
        assertThat(nuevo.path("version").asLong()).isEqualTo(1);
        assertThat(nuevo.path("actualizadoEn").asString()).isEqualTo("2026-12-31T23:30:00.123457Z");
        assertThat(nuevo.path("conceptos"))
                .extracting(c -> c.path("posicion").asInt())
                .containsExactly(2, 7, 9);
        var guardado = servicio.consultar(actores.get("SOLICITANTE"), s.id());
        UUID conservar = guardado.conceptos().getFirst().id();
        entrada = edicion(guardado, List.of(linea(conservar, "1", "2.0000", 4)), null, null);
        assertThat(
                        enviar(
                                        "PUT",
                                        "/api/solicitudes/" + s.id(),
                                        entrada.toString(),
                                        "SOLICITANTE",
                                        true,
                                        null)
                                .statusCode())
                .isEqualTo(200);
        assertThat(cuenta("conceptos_solicitud")).isEqualTo(1);
        guardado = servicio.consultar(actores.get("SOLICITANTE"), s.id());
        assertThat(guardado.conceptos().getFirst().id()).isEqualTo(conservar);
        assertThat(guardado.importeTotal()).isEqualByComparingTo("2.00");
        assertThat(guardado.numero()).isEqualTo(s.numero());
        assertThat(
                        enviar(
                                        "PUT",
                                        "/api/solicitudes/" + s.id(),
                                        edicion(guardado, List.of(), null, null).toString(),
                                        "SOLICITANTE",
                                        true,
                                        null)
                                .statusCode())
                .isEqualTo(200);
        assertThat(cuenta("conceptos_solicitud")).isZero();
    }

    @Test
    void idsAjenosDuplicadosPosicionesYMasDe100NoMutan() throws Exception {
        var s = preparada("SOLICITANTE");
        var ajena = preparada("AJENO");
        var original = detalle(s.id(), "SOLICITANTE");
        for (List<ObjectNode> conceptos :
                List.of(
                        List.of(linea(ajena.conceptos().getFirst().id(), "1", "2", 1)),
                        List.of(linea(UUID.randomUUID(), "1", "2", 1)),
                        List.of(
                                linea(s.conceptos().getFirst().id(), "1", "2", 1),
                                linea(s.conceptos().getFirst().id(), "1", "2", 2)),
                        List.of(linea(null, "1", "2", 1), linea(null, "1", "2", 1))))
            error(
                    enviar(
                            "PUT",
                            "/api/solicitudes/" + s.id(),
                            edicion(s, conceptos, s.proveedorId(), s.supervisorId()).toString(),
                            "SOLICITANTE",
                            true,
                            null),
                    400,
                    "SOLICITUD_INVALIDA");
        var lineas = new ArrayList<ObjectNode>();
        for (int i = 1; i <= 101; i++) lineas.add(linea(null, "1", "1", i));
        error(
                enviar(
                        "PUT",
                        "/api/solicitudes/" + s.id(),
                        edicion(s, lineas, s.proveedorId(), s.supervisorId()).toString(),
                        "SOLICITANTE",
                        true,
                        null),
                400,
                "SOLICITUD_INVALIDA");
        assertThat(detalle(s.id(), "SOLICITANTE")).isEqualTo(original);
    }

    @Test
    void versionObsoletaNoPisaYPresentadaInmutable() throws Exception {
        var s = preparada("SOLICITANTE");
        var entrada = edicion(s, List.of(), null, null);
        entrada.put("version", 0);
        error(
                enviar(
                        "PUT",
                        "/api/solicitudes/" + s.id(),
                        entrada.toString(),
                        "SOLICITANTE",
                        true,
                        null),
                409,
                "VERSION_OBSOLETA");
        error(presentar(s, "SOLICITANTE", UUID.randomUUID(), 0), 409, "VERSION_OBSOLETA");
        assertThat(presentar(s, "SOLICITANTE", UUID.randomUUID(), s.version()).statusCode())
                .isEqualTo(200);
        error(
                enviar(
                        "PUT",
                        "/api/solicitudes/" + s.id(),
                        edicion(s, List.of(), null, null).toString(),
                        "SOLICITANTE",
                        true,
                        null),
                409,
                "SOLICITUD_NO_EDITABLE");
        error(
                presentar(s, "SOLICITANTE", UUID.randomUUID(), s.version() + 1),
                409,
                "SOLICITUD_NO_EDITABLE");
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isEqualTo(1);
    }

    @Test
    void presentarSnapshotResultadoExactoYReplayPersistido() throws Exception {
        var s = preparada("SOLICITANTE");
        UUID clave = UUID.randomUUID();
        var primera = presentar(s, "SOLICITANTE", clave, s.version());
        assertThat(primera.statusCode()).isEqualTo(200);
        var resultado = json.readTree(primera.body());
        assertThat(resultado.propertyNames())
                .containsExactlyInAnyOrder(
                        "id",
                        "numero",
                        "estado",
                        "version",
                        "actualizadoEn",
                        "presentadoEn",
                        "moneda",
                        "importeTotal");
        assertThat(resultado.path("estado").asString()).isEqualTo("PRESENTADA");
        assertThat(resultado.path("version").asLong()).isEqualTo(2);
        administrador.update(
                "UPDATE gestion.proveedores SET denominacion='Catálogo cambiado',identificador_fiscal='CAMBIO',activo=false WHERE id=?",
                s.proveedorId());
        var detalle = detalle(s.id(), "SOLICITANTE");
        assertThat(detalle.path("proveedor").path("denominacion").asString())
                .isEqualTo("Proveedor ficticio");
        assertThat(detalle.path("proveedor").path("activo").isNull()).isTrue();
        administrador.update(
                "UPDATE gestion.solicitudes SET version=version+1,actualizado_en=actualizado_en+interval '1 second' WHERE id=?",
                s.id());
        assertThat(presentar(s, "SOLICITANTE", clave, s.version()).body())
                .isEqualTo(primera.body());
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isEqualTo(1);
        assertThat(
                        administrador.queryForObject(
                                "SELECT expira_en IS NULL FROM gestion.operaciones_idempotentes_solicitud",
                                Boolean.class))
                .isTrue();
    }

    @Test
    void idempotenciaIncompatiblePorVersionYPorRecursoNoConcedeAcceso() throws Exception {
        var s = preparada("SOLICITANTE");
        var otro = preparada("SOLICITANTE");
        UUID clave = UUID.randomUUID();
        assertThat(presentar(s, "SOLICITANTE", clave, s.version()).statusCode()).isEqualTo(200);
        error(
                presentar(s, "SOLICITANTE", clave, s.version() + 1),
                409,
                "CLAVE_IDEMPOTENCIA_REUTILIZADA");
        error(
                presentar(otro, "SOLICITANTE", clave, otro.version()),
                409,
                "CLAVE_IDEMPOTENCIA_REUTILIZADA");
        error(presentar(s, "AJENO", clave, s.version()), 404, "SOLICITUD_NO_ENCONTRADA");
        assertThat(detalle(otro.id(), "SOLICITANTE").path("estado").asString())
                .isEqualTo("BORRADOR");
    }

    @Test
    void cabeceraIdempotenciaYVersionRequeridasEstrictas() throws Exception {
        var s = preparada("SOLICITANTE");
        for (String clave : List.of("", "1-1-1-1-1", "no-uuid"))
            error(
                    enviar(
                            "POST",
                            "/api/solicitudes/" + s.id() + "/presentar",
                            "{\"version\":1}",
                            "SOLICITANTE",
                            true,
                            clave),
                    400,
                    "SOLICITUD_INVALIDA");
        error(
                enviar(
                        "POST",
                        "/api/solicitudes/" + s.id() + "/presentar",
                        "{\"version\":1}",
                        "SOLICITANTE",
                        true,
                        null),
                400,
                "SOLICITUD_INVALIDA");
        for (String entrada :
                List.of("{}", "{\"version\":1,\"estado\":\"PRESENTADA\"}", "{\"version\":\"1\"}"))
            error(
                    enviar(
                            "POST",
                            "/api/solicitudes/" + s.id() + "/presentar",
                            entrada,
                            "SOLICITANTE",
                            true,
                            UUID.randomUUID().toString()),
                    400,
                    "SOLICITUD_INVALIDA");
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isZero();
    }

    @Test
    void proveedorVivoEnBorradorInactivoOcultoYRevalidado() throws Exception {
        var s = preparada("SOLICITANTE");
        administrador.update(
                "UPDATE gestion.proveedores SET denominacion='Cambio vivo',activo=false WHERE id=?",
                s.proveedorId());
        var detalle = detalle(s.id(), "SOLICITANTE");
        assertThat(detalle.path("proveedorId").asString()).isEqualTo(s.proveedorId().toString());
        assertThat(detalle.path("proveedor").isNull()).isTrue();
        assertThat(detalle(s.id(), "AUDITOR").path("proveedor").path("denominacion").asString())
                .isEqualTo("Cambio vivo");
        error(
                presentar(s, "SOLICITANTE", UUID.randomUUID(), s.version()),
                409,
                "PROVEEDOR_INACTIVO");
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isZero();
        assertThat(
                        enviar(
                                        "PUT",
                                        "/api/solicitudes/" + s.id(),
                                        edicion(
                                                        s,
                                                        List.of(
                                                                linea(
                                                                        s.conceptos()
                                                                                .getFirst()
                                                                                .id(),
                                                                        "1",
                                                                        "10",
                                                                        1)),
                                                        s.proveedorId(),
                                                        s.supervisorId())
                                                .toString(),
                                        "SOLICITANTE",
                                        true,
                                        null)
                                .statusCode())
                .isEqualTo(200);
        var otro = crear("SOLICITANTE", "Otro borrador");
        error(
                enviar(
                        "PUT",
                        "/api/solicitudes/" + otro.id(),
                        edicion(otro, List.of(), s.proveedorId(), null).toString(),
                        "SOLICITANTE",
                        true,
                        null),
                409,
                "PROVEEDOR_INACTIVO");
    }

    @Test
    void supervisorActualInhabilitadoSinRolPropioYOtroRolRechazados() throws Exception {
        var s = preparada("SOLICITANTE");
        administrador.update(
                "UPDATE gestion.usuarios SET habilitado=false WHERE id=?", s.supervisorId());
        error(
                presentar(s, "SOLICITANTE", UUID.randomUUID(), s.version()),
                409,
                "SUPERVISOR_INVALIDO");
        administrador.update(
                "UPDATE gestion.usuarios SET habilitado=true WHERE id=?", s.supervisorId());
        administrador.update(
                "DELETE FROM gestion.usuarios_roles WHERE usuario_id=? AND rol='SUPERVISOR'",
                s.supervisorId());
        error(
                presentar(s, "SOLICITANTE", UUID.randomUUID(), s.version()),
                409,
                "SUPERVISOR_INVALIDO");
        var multi = crear("MULTI", "Autoselección");
        for (UUID supervisor :
                List.of(actores.get("MULTI").id(), actores.get("AUDITOR").id(), UUID.randomUUID()))
            error(
                    enviar(
                            "PUT",
                            "/api/solicitudes/" + multi.id(),
                            edicion(multi, List.of(), null, supervisor).toString(),
                            "MULTI",
                            true,
                            null),
                    409,
                    "SUPERVISOR_INVALIDO");
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isZero();
    }

    @Test
    void presentacionExigeReferenciasConceptosYTotalMayorCero() throws Exception {
        var vacio = crear("SOLICITANTE", "Incompleto");
        error(presentar(vacio, "SOLICITANTE", UUID.randomUUID(), 0), 409, "PROVEEDOR_INACTIVO");
        UUID proveedor = proveedor();
        var datos = new DatosBorrador("Incompleto", null, proveedor, null, List.of(), Set.of());
        var s =
                servicio.guardar(
                        actores.get("SOLICITANTE"), vacio.id(), 0, datos, UUID.randomUUID());
        error(
                presentar(s, "SOLICITANTE", UUID.randomUUID(), s.version()),
                409,
                "SUPERVISOR_INVALIDO");
        s =
                servicio.guardar(
                        actores.get("SOLICITANTE"),
                        s.id(),
                        s.version(),
                        new DatosBorrador(
                                "Incompleto",
                                null,
                                proveedor,
                                actores.get("SUPERVISOR").id(),
                                List.of(),
                                Set.of()),
                        UUID.randomUUID());
        error(
                presentar(s, "SOLICITANTE", UUID.randomUUID(), s.version()),
                400,
                "SOLICITUD_INVALIDA");
        var c =
                new Concepto(
                        UUID.randomUUID(),
                        "Mínimo",
                        new java.math.BigDecimal("0.001"),
                        Concepto.Unidad.UNIDAD,
                        new java.math.BigDecimal("0.0001"),
                        null,
                        1);
        s =
                servicio.guardar(
                        actores.get("SOLICITANTE"),
                        s.id(),
                        s.version(),
                        new DatosBorrador(
                                "Incompleto",
                                null,
                                proveedor,
                                actores.get("SUPERVISOR").id(),
                                List.of(c),
                                Set.of()),
                        UUID.randomUUID());
        error(
                presentar(s, "SOLICITANTE", UUID.randomUUID(), s.version()),
                400,
                "SOLICITUD_INVALIDA");
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isZero();
    }

    @Test
    void selectorAcotadoActualSinSecretosNiActor() throws Exception {
        var respuesta = enviar("GET", "/api/identidad/supervisores", null, "MULTI", false, null);
        assertThat(respuesta.statusCode()).isEqualTo(200);
        var pagina = json.readTree(respuesta.body());
        assertThat(pagina.path("totalElementos").asLong()).isEqualTo(1);
        assertThat(pagina.path("elementos").get(0).propertyNames())
                .containsExactlyInAnyOrder("id", "nombreVisible");
        assertThat(pagina.path("elementos").get(0).path("id").asString())
                .isEqualTo(actores.get("SUPERVISOR").id().toString());
        assertThat(
                        enviar(
                                        "GET",
                                        "/api/identidad/supervisores?nombre="
                                                + url("SUPERVISOR")
                                                + "&size=1",
                                        null,
                                        "SOLICITANTE",
                                        false,
                                        null)
                                .statusCode())
                .isEqualTo(200);
        administrador.update(
                "UPDATE gestion.usuarios SET habilitado=false WHERE id=?",
                actores.get("SUPERVISOR").id());
        assertThat(
                        json.readTree(
                                        enviar(
                                                        "GET",
                                                        "/api/identidad/supervisores",
                                                        null,
                                                        "MULTI",
                                                        false,
                                                        null)
                                                .body())
                                .path("totalElementos")
                                .asLong())
                .isZero();
        for (String query :
                List.of(
                        "?size=101",
                        "?page=-1",
                        "?nombre=a&nombre=b",
                        "?roles=SUPERVISOR",
                        "?nombre=" + "a".repeat(129)))
            error(
                    enviar(
                            "GET",
                            "/api/identidad/supervisores" + query,
                            null,
                            "SOLICITANTE",
                            false,
                            null),
                    400,
                    "SOLICITUD_INVALIDA");
        error(
                enviar("GET", "/api/identidad/supervisores", null, null, false, null),
                401,
                "NO_AUTENTICADO");
    }

    @Test
    void listadoVisibilidadAntesConteoYUnionMultirrol() throws Exception {
        var a = preparada("SOLICITANTE");
        var b = preparada("AJENO");
        crear("MULTI", "Borrador multi");
        crear("ADMIN_SOL", "Propia administrador");
        presentar(a, "SOLICITANTE", UUID.randomUUID(), a.version());
        assertThat(pagina("", "SOLICITANTE").path("totalElementos").asLong()).isEqualTo(1);
        assertThat(pagina("", "SUPERVISOR").path("totalElementos").asLong()).isEqualTo(1);
        assertThat(pagina("", "MULTI").path("totalElementos").asLong()).isEqualTo(1);
        assertThat(pagina("", "AUDITOR").path("totalElementos").asLong()).isEqualTo(4);
        assertThat(pagina("", "ADMINISTRADOR").path("totalElementos").asLong()).isEqualTo(4);
        assertThat(pagina("", "AUD_SOL").path("totalElementos").asLong()).isEqualTo(4);
        assertThat(pagina("?size=1&page=1", "SUPERVISOR").path("elementos").size()).isZero();
        assertThat(pagina("?size=1&page=1", "SUPERVISOR").path("totalElementos").asLong())
                .isEqualTo(1);
        error(
                enviar(
                        "GET",
                        "/api/solicitudes?autor=" + b.autor().id(),
                        null,
                        "SOLICITANTE",
                        false,
                        null),
                403,
                "ACCESO_NO_PERMITIDO");
        assertThat(pagina("?autor=" + b.autor().id(), "AUDITOR").path("totalElementos").asLong())
                .isEqualTo(1);
        var resumen = pagina("", "SOLICITANTE").path("elementos").get(0);
        assertThat(resumen.has("conceptos")).isFalse();
        assertThat(resumen.has("descripcion")).isFalse();
    }

    @Test
    void filtrosLiteralesAcentosFechasYOrdenesEstables() throws Exception {
        var a = crear("SOLICITANTE", "Árbol 100%_! Exacto");
        crear("SOLICITANTE", "Arbol 100AA");
        crear("SOLICITANTE", "Otros datos");
        for (String texto : List.of("ÁRBOL", "%_!"))
            assertThat(
                            pagina("?asunto=" + url(texto), "SOLICITANTE")
                                    .path("totalElementos")
                                    .asLong())
                    .isEqualTo(1);
        assertThat(
                        pagina("?numero=" + a.numero(), "SOLICITANTE")
                                .path("elementos")
                                .get(0)
                                .path("id")
                                .asString())
                .isEqualTo(a.id().toString());
        assertThat(
                        pagina("?fechaDesde=2026-12-31&fechaHasta=2026-12-31", "SOLICITANTE")
                                .path("totalElementos")
                                .asLong())
                .isEqualTo(3);
        assertThat(pagina("?fechaDesde=2027-01-01", "SOLICITANTE").path("totalElementos").asLong())
                .isZero();
        for (String campo : List.of("numero", "creadoEn", "actualizadoEn", "importeTotal"))
            for (String sentido : List.of("asc", "desc"))
                assertThat(
                                pagina("?sort=" + campo + "," + sentido, "SOLICITANTE")
                                        .path("elementos")
                                        .size())
                        .isEqualTo(3);
        var estable = pagina("?sort=importeTotal,desc", "SOLICITANTE");
        var ids = new ArrayList<String>();
        estable.path("elementos").forEach(e -> ids.add(e.path("id").asString()));
        assertThat(ids).isSorted();
        var preparada = preparada("SOLICITANTE");
        assertThat(
                        pagina(
                                        "?proveedor="
                                                + preparada.proveedorId()
                                                + "&supervisor="
                                                + preparada.supervisorId()
                                                + "&estado=BORRADOR",
                                        "SOLICITANTE")
                                .path("totalElementos")
                                .asLong())
                .isEqualTo(1);
        assertThat(
                        pagina(
                                        "?proveedor="
                                                + preparada.proveedorId()
                                                + "&asunto=Inexistente",
                                        "SOLICITANTE")
                                .path("totalElementos")
                                .asLong())
                .isZero();
    }

    @Test
    void filtrosInvalidosDuplicadosYUnknownSon400() throws Exception {
        for (String query :
                List.of(
                        "?sort=asunto,asc",
                        "?sort=numero,invalid",
                        "?estado=ANULADA",
                        "?page=1&page=2",
                        "?x=1",
                        "?size=0",
                        "?size=101",
                        "?page=-1",
                        "?page=99999999",
                        "?fechaDesde=2026-12-32",
                        "?fechaDesde=2027-01-01&fechaHasta=2026-01-01",
                        "?numero=SOL-1",
                        "?proveedor=1-1-1-1-1",
                        "?asunto=" + "a".repeat(161)))
            error(
                    enviar("GET", "/api/solicitudes" + query, null, "AUDITOR", false, null),
                    400,
                    "SOLICITUD_INVALIDA");
    }

    @Test
    void rollbackTrasActualizarCabeceraYBorrarLineas() throws Exception {
        var s = preparada("SOLICITANTE");
        var original = detalle(s.id(), "SOLICITANTE");
        // El trigger falla durante INSERT, después del UPDATE de cabecera y DELETE de la colección.
        administrador.execute(
                "CREATE FUNCTION gestion.fallo_concepto_ag012() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fallo ficticio de prueba'; END $$");
        administrador.execute(
                "CREATE TRIGGER fallo_concepto_ag012 BEFORE INSERT ON gestion.conceptos_solicitud FOR EACH ROW EXECUTE FUNCTION gestion.fallo_concepto_ag012()");
        eventos.list.clear();
        try {
            error(
                    enviar(
                            "PUT",
                            "/api/solicitudes/" + s.id(),
                            edicion(
                                            s,
                                            List.of(
                                                    linea(
                                                            s.conceptos().getFirst().id(),
                                                            "9",
                                                            "7",
                                                            3)),
                                            s.proveedorId(),
                                            s.supervisorId())
                                    .toString(),
                            "SOLICITANTE",
                            true,
                            null),
                    500,
                    "ERROR_INTERNO");
            assertThat(detalle(s.id(), "SOLICITANTE")).isEqualTo(original);
            assertThat(eventos.list)
                    .noneMatch(e -> e.getFormattedMessage().contains("resultado=CORRECTO"));
        } finally {
            administrador.execute(
                    "DROP TRIGGER fallo_concepto_ag012 ON gestion.conceptos_solicitud");
            administrador.execute("DROP FUNCTION gestion.fallo_concepto_ag012()");
        }
    }

    @Test
    void rollbackPresentacionAntesDePersistirResultadoNoConsumeClave() throws Exception {
        var s = preparada("SOLICITANTE");
        var original = detalle(s.id(), "SOLICITANTE");
        UUID clave = UUID.randomUUID();
        administrador.execute(
                "CREATE FUNCTION gestion.fallo_idempotencia_ag012() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fallo ficticio de prueba'; END $$");
        administrador.execute(
                "CREATE TRIGGER fallo_idempotencia_ag012 BEFORE INSERT ON gestion.operaciones_idempotentes_solicitud FOR EACH ROW EXECUTE FUNCTION gestion.fallo_idempotencia_ag012()");
        eventos.list.clear();
        try {
            error(presentar(s, "SOLICITANTE", clave, s.version()), 500, "ERROR_INTERNO");
            assertThat(detalle(s.id(), "SOLICITANTE")).isEqualTo(original);
            assertThat(cuenta("operaciones_idempotentes_solicitud")).isZero();
            assertThat(eventos.list)
                    .noneMatch(e -> e.getFormattedMessage().contains("resultado=CORRECTO"));
        } finally {
            administrador.execute(
                    "DROP TRIGGER fallo_idempotencia_ag012 ON gestion.operaciones_idempotentes_solicitud");
            administrador.execute("DROP FUNCTION gestion.fallo_idempotencia_ag012()");
        }
        assertThat(presentar(s, "SOLICITANTE", clave, s.version()).statusCode()).isEqualTo(200);
    }

    @Test
    void dosGuardadosConcurrentesSoloUnoActualiza() throws Exception {
        var s = preparada("SOLICITANTE");
        String entrada =
                edicion(
                                s,
                                List.of(linea(s.conceptos().getFirst().id(), "3", "5", 1)),
                                s.proveedorId(),
                                s.supervisorId())
                        .toString();
        try (var bloqueo =
                        bloquear(
                                "SELECT id FROM gestion.solicitudes WHERE id=? FOR UPDATE",
                                s.id());
                var hilos = Executors.newFixedThreadPool(2)) {
            var a =
                    hilos.submit(
                            () ->
                                    enviar(
                                            "PUT",
                                            "/api/solicitudes/" + s.id(),
                                            entrada,
                                            "SOLICITANTE",
                                            true,
                                            null));
            var b =
                    hilos.submit(
                            () ->
                                    enviar(
                                            "PUT",
                                            "/api/solicitudes/" + s.id(),
                                            entrada,
                                            "SOLICITANTE",
                                            true,
                                            null));
            esperarBloqueos(2);
            bloqueo.commit();
            var resultados = List.of(a.get(10, TimeUnit.SECONDS), b.get(10, TimeUnit.SECONDS));
            assertThat(resultados)
                    .extracting(HttpResponse::statusCode)
                    .containsExactlyInAnyOrder(200, 409);
            assertThat(
                            resultados.stream()
                                    .filter(r -> r.statusCode() == 409)
                                    .findFirst()
                                    .orElseThrow()
                                    .body())
                    .contains("VERSION_OBSOLETA");
        }
        assertThat(servicio.consultar(actores.get("SOLICITANTE"), s.id()).version()).isEqualTo(2);
        assertThat(cuenta("conceptos_solicitud")).isEqualTo(1);
    }

    @Test
    void dosClavesConcurrentesSoloUnaPresentacion() throws Exception {
        var s = preparada("SOLICITANTE");
        try (var bloqueo =
                        bloquear(
                                "SELECT id FROM gestion.solicitudes WHERE id=? FOR UPDATE",
                                s.id());
                var hilos = Executors.newFixedThreadPool(2)) {
            var a = hilos.submit(() -> presentar(s, "SOLICITANTE", UUID.randomUUID(), s.version()));
            var b = hilos.submit(() -> presentar(s, "SOLICITANTE", UUID.randomUUID(), s.version()));
            esperarBloqueos(2);
            bloqueo.commit();
            assertThat(
                            List.of(
                                    a.get(10, TimeUnit.SECONDS).statusCode(),
                                    b.get(10, TimeUnit.SECONDS).statusCode()))
                    .containsExactlyInAnyOrder(200, 409);
        }
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isEqualTo(1);
        assertThat(servicio.consultar(actores.get("SOLICITANTE"), s.id()).version()).isEqualTo(2);
    }

    @Test
    void mismaClaveConcurrenteDevuelveDosResultadosIdenticos() throws Exception {
        var s = preparada("SOLICITANTE");
        UUID clave = UUID.randomUUID();
        try (var bloqueo =
                        bloquear(
                                "SELECT id FROM gestion.solicitudes WHERE id=? FOR UPDATE",
                                s.id());
                var hilos = Executors.newFixedThreadPool(2)) {
            var a = hilos.submit(() -> presentar(s, "SOLICITANTE", clave, s.version()));
            var b = hilos.submit(() -> presentar(s, "SOLICITANTE", clave, s.version()));
            esperarBloqueos(2);
            bloqueo.commit();
            var ra = a.get(10, TimeUnit.SECONDS);
            var rb = b.get(10, TimeUnit.SECONDS);
            assertThat(ra.statusCode()).isEqualTo(200);
            assertThat(rb.statusCode()).isEqualTo(200);
            assertThat(ra.body()).isEqualTo(rb.body());
        }
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isEqualTo(1);
    }

    @Test
    void mismaClaveConcurrenteEntreRecursosSerializaSinDeadlock() throws Exception {
        var s = preparada("SOLICITANTE");
        var otro = preparada("SOLICITANTE");
        UUID clave = UUID.randomUUID();
        try (var bloqueo =
                        bloquear(
                                "SELECT id FROM gestion.solicitudes WHERE id=? FOR UPDATE",
                                s.id());
                var hilos = Executors.newFixedThreadPool(2)) {
            var a = hilos.submit(() -> presentar(s, "SOLICITANTE", clave, s.version()));
            esperarBloqueos(1);
            var b = hilos.submit(() -> presentar(otro, "SOLICITANTE", clave, otro.version()));
            esperarBloqueos(2);
            bloqueo.commit();
            assertThat(a.get(10, TimeUnit.SECONDS).statusCode()).isEqualTo(200);
            error(b.get(10, TimeUnit.SECONDS), 409, "CLAVE_IDEMPOTENCIA_REUTILIZADA");
        }
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isEqualTo(1);
        assertThat(servicio.consultar(actores.get("SOLICITANTE"), otro.id()).estado())
                .isEqualTo("BORRADOR");
    }

    @Test
    void guardarYPresentarConcurrentesSeOrdenanSinPerderCambios() throws Exception {
        var s = preparada("SOLICITANTE");
        String entrada =
                edicion(
                                s,
                                List.of(linea(s.conceptos().getFirst().id(), "7", "2", 1)),
                                s.proveedorId(),
                                s.supervisorId())
                        .toString();
        try (var bloqueo =
                        bloquear(
                                "SELECT id FROM gestion.solicitudes WHERE id=? FOR UPDATE",
                                s.id());
                var hilos = Executors.newFixedThreadPool(2)) {
            var a =
                    hilos.submit(
                            () ->
                                    enviar(
                                            "PUT",
                                            "/api/solicitudes/" + s.id(),
                                            entrada,
                                            "SOLICITANTE",
                                            true,
                                            null));
            var b = hilos.submit(() -> presentar(s, "SOLICITANTE", UUID.randomUUID(), s.version()));
            esperarBloqueos(2);
            bloqueo.commit();
            assertThat(
                            List.of(
                                    a.get(10, TimeUnit.SECONDS).statusCode(),
                                    b.get(10, TimeUnit.SECONDS).statusCode()))
                    .containsExactlyInAnyOrder(200, 409);
        }
        var fin = servicio.consultar(actores.get("SOLICITANTE"), s.id());
        assertThat(fin.version()).isEqualTo(2);
        assertThat(fin.importeTotal())
                .isEqualByComparingTo(fin.estado().equals("BORRADOR") ? "14.00" : "10.31");
    }

    @Test
    void bajaProveedorConfirmadaAntesDePresentarSeRevalidaBajoBloqueo() throws Exception {
        var s = preparada("SOLICITANTE");
        try (var bloqueo =
                        bloquear(
                                "SELECT id FROM gestion.proveedores WHERE id=? FOR UPDATE",
                                s.proveedorId());
                var hilos = Executors.newSingleThreadExecutor()) {
            try (var sql =
                    bloqueo.prepareStatement(
                            "UPDATE gestion.proveedores SET activo=false WHERE id=?")) {
                sql.setObject(1, s.proveedorId());
                sql.executeUpdate();
            }
            var futura =
                    hilos.submit(() -> presentar(s, "SOLICITANTE", UUID.randomUUID(), s.version()));
            esperarBloqueos(1);
            bloqueo.commit();
            error(futura.get(10, TimeUnit.SECONDS), 409, "PROVEEDOR_INACTIVO");
        }
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isZero();
    }

    @Test
    void presentacionBloqueaProveedorHastaConfirmarSnapshot() throws Exception {
        var s = preparada("SOLICITANTE");
        var admin = actores.get("ADMINISTRADOR");
        // Se retiene el rol: presentar ya posee FOR SHARE del proveedor cuando espera la función.
        try (var bloqueo =
                        bloquear(
                                "SELECT usuario_id FROM gestion.usuarios_roles WHERE usuario_id=? AND rol='SUPERVISOR' FOR UPDATE",
                                s.supervisorId());
                var hilos = Executors.newFixedThreadPool(2)) {
            var presentar =
                    hilos.submit(() -> presentar(s, "SOLICITANTE", UUID.randomUUID(), s.version()));
            esperarBloqueos(1);
            var desactivar =
                    hilos.submit(
                            () ->
                                    contexto.getBean(ServicioProveedores.class)
                                            .cambiarEstado(
                                                    new ActorProveedor(admin.id(), admin.roles()),
                                                    s.proveedorId(),
                                                    0,
                                                    false));
            esperarBloqueos(2);
            bloqueo.commit();
            assertThat(presentar.get(10, TimeUnit.SECONDS).statusCode()).isEqualTo(200);
            assertThat(desactivar.get(10, TimeUnit.SECONDS).activo()).isFalse();
        }
        assertThat(detalle(s.id(), "SOLICITANTE").path("proveedor").path("activo").isNull())
                .isTrue();
    }

    @Test
    void bajaSupervisorConcurrenteSeRevalida() throws Exception {
        var s = preparada("SOLICITANTE");
        try (var bloqueo =
                        bloquear(
                                "SELECT id FROM gestion.usuarios WHERE id=? FOR UPDATE",
                                s.supervisorId());
                var hilos = Executors.newSingleThreadExecutor()) {
            try (var sql =
                    bloqueo.prepareStatement(
                            "UPDATE gestion.usuarios SET habilitado=false WHERE id=?")) {
                sql.setObject(1, s.supervisorId());
                sql.executeUpdate();
            }
            var futura =
                    hilos.submit(() -> presentar(s, "SOLICITANTE", UUID.randomUUID(), s.version()));
            esperarBloqueos(1);
            bloqueo.commit();
            error(futura.get(10, TimeUnit.SECONDS), 409, "SUPERVISOR_INVALIDO");
        }
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isZero();
    }

    @Test
    void retiradaRolConcurrenteSeRevalida() throws Exception {
        var s = preparada("SOLICITANTE");
        try (var bloqueo =
                        bloquear(
                                "SELECT usuario_id FROM gestion.usuarios_roles WHERE usuario_id=? AND rol='SUPERVISOR' FOR UPDATE",
                                s.supervisorId());
                var hilos = Executors.newSingleThreadExecutor()) {
            try (var sql =
                    bloqueo.prepareStatement(
                            "DELETE FROM gestion.usuarios_roles WHERE usuario_id=? AND rol='SUPERVISOR'")) {
                sql.setObject(1, s.supervisorId());
                sql.executeUpdate();
            }
            var futura =
                    hilos.submit(() -> presentar(s, "SOLICITANTE", UUID.randomUUID(), s.version()));
            esperarBloqueos(1);
            bloqueo.commit();
            error(futura.get(10, TimeUnit.SECONDS), 409, "SUPERVISOR_INVALIDO");
        }
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isZero();
    }

    @Test
    void numeracionConcurrenteUnicaYAgotamiento503Controlado() throws Exception {
        try (var hilos = Executors.newFixedThreadPool(4)) {
            List<Future<Solicitud>> futuros = new ArrayList<>();
            for (int i = 0; i < 12; i++)
                futuros.add(hilos.submit(() -> crear("SOLICITANTE", "Número concurrente")));
            Set<String> numeros = new HashSet<>();
            for (var f : futuros) numeros.add(f.get(10, TimeUnit.SECONDS).numero());
            assertThat(numeros).hasSize(12);
        }
        administrador.execute("SELECT setval('gestion.numero_solicitud_seq',999999,true)");
        error(
                enviar(
                        "POST",
                        "/api/solicitudes",
                        "{\"asunto\":\"Agotamiento\"}",
                        "SOLICITANTE",
                        true,
                        null),
                503,
                "NUMERACION_AGOTADA");
        assertThat(cuenta("solicitudes")).isEqualTo(12);
    }

    @Test
    void privilegiosMinimosRestriccionesYFuncionConSearchPathFijo() throws Exception {
        var s = preparada("SOLICITANTE");
        try (var conexion =
                        DriverManager.getConnection(
                                base.getJdbcUrl(), "gestion_app", "aplicacion-ficticia-prueba");
                var sql = conexion.createStatement()) {
            for (String sentencia :
                    List.of(
                            "DELETE FROM gestion.solicitudes",
                            "DELETE FROM gestion.operaciones_idempotentes_solicitud",
                            "UPDATE gestion.operaciones_idempotentes_solicitud SET operacion='PRESENTAR'",
                            "UPDATE gestion.usuarios_roles SET rol='AUDITOR'",
                            "TRUNCATE gestion.solicitudes",
                            "ALTER TABLE gestion.solicitudes ADD COLUMN prohibida text",
                            "ALTER SEQUENCE gestion.numero_solicitud_seq RESTART WITH 1"))
                assertThatThrownBy(() -> sql.execute(sentencia))
                        .isInstanceOf(SQLException.class)
                        .satisfies(
                                e ->
                                        assertThat(((SQLException) e).getSQLState())
                                                .isEqualTo("42501"));
            for (String sentencia :
                    List.of(
                            "UPDATE gestion.solicitudes SET estado='ANULADA'",
                            "UPDATE gestion.solicitudes SET total=-1",
                            "UPDATE gestion.solicitudes SET version=-1",
                            "UPDATE gestion.solicitudes SET moneda='USD'",
                            "UPDATE gestion.solicitudes SET presentado_en=creado_en-interval '1 second'",
                            "UPDATE gestion.solicitudes SET estado='PRESENTADA',presentado_en=actualizado_en,proveedor_denominacion='Ficticio',proveedor_pais_fiscal='ES',proveedor_identificador_fiscal='FIC',proveedor_tipo=NULL"))
                assertThatThrownBy(() -> sql.execute(sentencia))
                        .isInstanceOf(SQLException.class)
                        .satisfies(
                                e ->
                                        assertThat(((SQLException) e).getSQLState())
                                                .isEqualTo("23514"));
            try (var consulta =
                    conexion.prepareStatement(
                            "SELECT * FROM gestion.supervisor_para_presentacion(?)")) {
                consulta.setObject(1, s.supervisorId());
                try (var filas = consulta.executeQuery()) {
                    assertThat(filas.getMetaData().getColumnCount()).isEqualTo(3);
                    assertThat(filas.getMetaData().getColumnName(1)).isEqualTo("id");
                    assertThat(filas.getMetaData().getColumnName(2)).isEqualTo("nombre_visible");
                    assertThat(filas.getMetaData().getColumnName(3)).isEqualTo("habilitado");
                    assertThat(filas.next()).isTrue();
                }
            }
        }
        assertThat(
                        administrador.queryForObject(
                                "SELECT prosecdef FROM pg_proc WHERE oid='gestion.supervisor_para_presentacion(uuid)'::regprocedure",
                                Boolean.class))
                .isTrue();
        assertThat(
                        administrador.queryForObject(
                                "SELECT array_to_string(proconfig,',') FROM pg_proc WHERE oid='gestion.supervisor_para_presentacion(uuid)'::regprocedure",
                                String.class))
                .isEqualTo("search_path=pg_catalog, gestion");
        assertThat(
                        administrador.queryForObject(
                                "SELECT count(*) FROM pg_proc p,aclexplode(p.proacl) a WHERE p.oid='gestion.supervisor_para_presentacion(uuid)'::regprocedure AND a.grantee=0",
                                Integer.class))
                .isZero();
        assertThat(
                        administrador.queryForObject(
                                "SELECT has_function_privilege('gestion_app','gestion.supervisor_para_presentacion(uuid)','EXECUTE')",
                                Boolean.class))
                .isTrue();
        assertThatThrownBy(
                        () ->
                                administrador.update(
                                        "INSERT INTO gestion.conceptos_solicitud(id,solicitud_id,descripcion,cantidad,unidad,precio_unitario,importe_linea,posicion) VALUES (?,?,'Huérfana',1,'UNIDAD',1,1,1)",
                                        UUID.randomUUID(),
                                        UUID.randomUUID()))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(
                        () ->
                                administrador.update(
                                        "UPDATE gestion.conceptos_solicitud SET importe_linea=999 WHERE solicitud_id=?",
                                        s.id()))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test
    void eventosMinimosTrasCommitYRechazosSinContenidoSensible() throws Exception {
        var s = crear("SOLICITANTE", "NO-LOG-ASUNTO");
        var entrada =
                edicion(
                        s,
                        List.of(linea(null, "1", "10", 1)),
                        proveedor(),
                        actores.get("SUPERVISOR").id());
        entrada.put("descripcion", "NO-LOG-DESCRIPCION");
        ((ObjectNode) entrada.path("conceptos").get(0)).put("descripcion", "NO-LOG-CONCEPTO");
        assertThat(
                        enviar(
                                        "PUT",
                                        "/api/solicitudes/" + s.id(),
                                        entrada.toString(),
                                        "SOLICITANTE",
                                        true,
                                        null)
                                .statusCode())
                .isEqualTo(200);
        var actual = servicio.consultar(actores.get("SOLICITANTE"), s.id());
        UUID clave = UUID.randomUUID();
        error(presentar(actual, "SOLICITANTE", UUID.randomUUID(), 0), 409, "VERSION_OBSOLETA");
        presentar(actual, "SOLICITANTE", clave, actual.version());
        presentar(actual, "SOLICITANTE", clave, actual.version());
        String logs =
                String.join(
                        "\n",
                        eventos.list.stream().map(ILoggingEvent::getFormattedMessage).toList());
        assertThat(logs)
                .contains(
                        "accion=CREAR_BORRADOR",
                        "accion=GUARDAR_BORRADOR",
                        "accion=PRESENTAR",
                        "accion=DUPLICADO_IDEMPOTENTE",
                        "resultado=VERSION_OBSOLETA",
                        "peticion=",
                        "clave_hash=")
                .doesNotContain(
                        "NO-LOG-ASUNTO",
                        "NO-LOG-DESCRIPCION",
                        "NO-LOG-CONCEPTO",
                        clave.toString(),
                        tokens.get("SOLICITANTE"),
                        "Proveedor ficticio",
                        "$argon2");
    }

    @Test
    void contratoOpenApiEntradasCerradasRespuestasYParametros() throws Exception {
        var api = json.readTree(enviar("GET", "/v3/api-docs", null, null, false, null).body());
        var schemas = api.path("components").path("schemas");
        var paths = api.path("paths");
        for (String nombre :
                List.of(
                        "AltaSolicitud",
                        "BorradorSolicitud",
                        "EntradaConceptoSolicitud",
                        "EntradaPresentacionSolicitud"))
            assertThat(schemas.path(nombre).path("additionalProperties").asBoolean(true))
                    .as(nombre + " cerrado")
                    .isFalse();
        assertThat(schemas.path("AltaSolicitud").path("properties").propertyNames())
                .containsExactly("asunto");
        assertThat(schemas.path("Alta").path("properties").has("tipo"))
                .as("contrato003 no colisiona")
                .isTrue();
        assertThat(
                        schemas.path("BorradorSolicitud")
                                .path("properties")
                                .path("conceptos")
                                .path("maxItems")
                                .asInt())
                .isEqualTo(100);
        assertThat(schemas.path("EntradaConceptoSolicitud").path("properties").has("importeLinea"))
                .isFalse();
        assertThat(schemas.path("ConceptoSolicitudPublico").path("properties").has("importeLinea"))
                .isTrue();
        assertThat(paths.path("/api/solicitudes").path("post").path("responses").has("201"))
                .isTrue();
        assertThat(paths.path("/api/solicitudes/{id}/presentar").path("post").path("parameters"))
                .anyMatch(
                        p ->
                                p.path("name").asString().equals("Idempotency-Key")
                                        && p.path("required").asBoolean());
        assertThat(paths.path("/api/solicitudes").path("get").path("parameters"))
                .extracting(p -> p.path("name").asString())
                .contains(
                        "numero",
                        "asunto",
                        "estado",
                        "proveedor",
                        "autor",
                        "supervisor",
                        "fechaDesde",
                        "fechaHasta",
                        "page",
                        "size",
                        "sort");
        assertThat(paths.path("/api/identidad/supervisores").path("get").path("parameters"))
                .extracting(p -> p.path("name").asString())
                .containsExactlyInAnyOrder("nombre", "page", "size");
    }

    private Connection bloquear(String sql, UUID id) throws SQLException {
        Connection conexion =
                DriverManager.getConnection(
                        base.getJdbcUrl(), base.getUsername(), base.getPassword());
        conexion.setAutoCommit(false);
        try (var consulta = conexion.prepareStatement(sql)) {
            consulta.setObject(1, id);
            consulta.executeQuery().close();
        }
        return conexion;
    }

    private void esperarBloqueos(int cantidad) throws InterruptedException {
        long limite = System.nanoTime() + TimeUnit.SECONDS.toNanos(8);
        int esperando = 0;
        while (System.nanoTime() < limite && esperando < cantidad) {
            esperando =
                    administrador.queryForObject(
                            "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND usename='gestion_app' AND wait_event_type='Lock'",
                            Integer.class);
            esperando +=
                    contexto.getBean(
                                    es.gestionsolicitudes.operaciones.aplicacion.ServicioOperaciones
                                            .class)
                            .esperasEnCurso();
            if (esperando < cantidad) Thread.sleep(20);
        }
        assertThat(esperando)
                .as("conexiones PostgreSQL esperando un bloqueo real antes de liberar la carrera")
                .isEqualTo(cantidad);
    }

    private Solicitud crear(String actor, String asunto) {
        return servicio.crear(actores.get(actor), asunto, UUID.randomUUID());
    }

    private UUID proveedor() {
        var admin = actores.get("ADMINISTRADOR");
        return contexto.getBean(ServicioProveedores.class)
                .crear(
                        new ActorProveedor(admin.id(), admin.roles()),
                        new DatosProveedor(
                                TipoProveedor.PERSONA_JURIDICA,
                                "Proveedor ficticio",
                                "ES",
                                "FIC-" + UUID.randomUUID(),
                                null,
                                null))
                .id();
    }

    private Solicitud preparada(String actor) {
        var s = crear(actor, "Solicitud preparada");
        var c =
                new Concepto(
                        UUID.randomUUID(),
                        "Concepto ficticio",
                        new java.math.BigDecimal("2.500"),
                        Concepto.Unidad.HORA,
                        new java.math.BigDecimal("4.1250"),
                        null,
                        1);
        return servicio.guardar(
                actores.get(actor),
                s.id(),
                s.version(),
                new DatosBorrador(
                        s.asunto(),
                        null,
                        proveedor(),
                        actores.get("SUPERVISOR").id(),
                        List.of(c),
                        Set.of()),
                UUID.randomUUID());
    }

    private ObjectNode linea(UUID id, String cantidad, String precio, int posicion) {
        var n = json.createObjectNode();
        if (id == null) n.putNull("id");
        else n.put("id", id.toString());
        n.put("descripcion", "Concepto ficticio");
        n.put("cantidad", cantidad);
        n.put("unidad", "UNIDAD");
        n.put("precioUnitario", precio);
        n.put("posicion", posicion);
        return n;
    }

    private ObjectNode edicion(
            Solicitud s, List<ObjectNode> lineas, UUID proveedor, UUID supervisor) {
        var n = json.createObjectNode();
        n.put("asunto", s.asunto());
        n.putNull("descripcion");
        if (proveedor == null) n.putNull("proveedorId");
        else n.put("proveedorId", proveedor.toString());
        if (supervisor == null) n.putNull("supervisorId");
        else n.put("supervisorId", supervisor.toString());
        n.put("version", s.version());
        var array = n.putArray("conceptos");
        lineas.forEach(array::add);
        return n;
    }

    private JsonNode detalle(UUID id, String actor) throws Exception {
        var r = enviar("GET", "/api/solicitudes/" + id, null, actor, false, null);
        assertThat(r.statusCode()).isEqualTo(200);
        return json.readTree(r.body());
    }

    private JsonNode pagina(String query, String actor) throws Exception {
        var r = enviar("GET", "/api/solicitudes" + query, null, actor, false, null);
        assertThat(r.statusCode()).isEqualTo(200);
        return json.readTree(r.body());
    }

    private long cuenta(String tabla) {
        return administrador.queryForObject("SELECT count(*) FROM gestion." + tabla, Long.class);
    }

    private HttpResponse<String> presentar(Solicitud s, String actor, UUID clave, long version)
            throws Exception {
        return enviar(
                "POST",
                "/api/solicitudes/" + s.id() + "/presentar",
                "{\"version\":" + version + "}",
                actor,
                true,
                clave.toString());
    }

    private HttpResponse<String> enviar(
            String metodo, String ruta, String cuerpo, String actor, boolean conCsrf, String clave)
            throws Exception {
        var p =
                HttpRequest.newBuilder(URI.create(origen + ruta))
                        .timeout(Duration.ofSeconds(15))
                        .header("Content-Type", "application/json")
                        .method(
                                metodo,
                                cuerpo == null
                                        ? HttpRequest.BodyPublishers.noBody()
                                        : HttpRequest.BodyPublishers.ofString(cuerpo));
        if (actor != null) p.header("Authorization", "Bearer " + tokens.get(actor));
        if (conCsrf) p.header("Cookie", "XSRF-TOKEN=" + csrf).header("X-XSRF-TOKEN", csrf);
        if (clave == null && metodo.equals("POST") && ruta.equals("/api/solicitudes"))
            clave = UUID.randomUUID().toString();
        if (clave != null) p.header("Idempotency-Key", clave);
        return cliente.send(p.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static String url(String valor) {
        return URLEncoder.encode(valor, StandardCharsets.UTF_8);
    }

    private static void noCache(HttpResponse<String> r) {
        assertThat(r.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
    }

    private static void error(HttpResponse<String> r, int estado, String codigo) {
        assertThat(r.statusCode()).as("HTTP %s, cuerpo %s", estado, r.body()).isEqualTo(estado);
        assertThat(r.body()).isEqualTo("{\"error\":\"" + codigo + "\"}");
        noCache(r);
    }
}
