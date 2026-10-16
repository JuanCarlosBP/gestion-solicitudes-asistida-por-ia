package es.gestionsolicitudes.solicitudes.integracion;

import static org.assertj.core.api.Assertions.*;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import es.gestionsolicitudes.GestionSolicitudesApplication;
import es.gestionsolicitudes.identidad.aplicacion.*;
import es.gestionsolicitudes.identidad.dominio.Rol;
import es.gestionsolicitudes.integracion.ContenedoresPrueba;
import es.gestionsolicitudes.proveedores.aplicacion.ServicioProveedores;
import es.gestionsolicitudes.proveedores.dominio.*;
import es.gestionsolicitudes.solicitudes.aplicacion.ServicioSolicitudes;
import es.gestionsolicitudes.solicitudes.dominio.*;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
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

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AprobacionesIT {
    private static final String IMAGEN =
            "postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826";
    private static final Instant AHORA = Instant.parse("2026-10-15T00:00:00.123456Z");
    private static final String CLAVE = "clave ficticia aprobaciones integración";
    private final JsonMapper json = JsonMapper.builder().build();
    private final Map<String, ActorSolicitud> actores = new HashMap<>();
    private final Map<String, String> tokens = new HashMap<>();
    private PostgreSQLContainer base;
    private ConfigurableApplicationContext contexto;
    private JdbcTemplate administrador;
    private ServicioSolicitudes servicio;
    private HttpClient cliente;
    private String origen, csrf;
    private Logger logger;
    private ListAppender<ILoggingEvent> eventos;
    private boolean migracionVerificada;

    @TestConfiguration(proxyBeanMethods = false)
    static class Componentes {
        @Bean
        @Primary
        Clock relojAprobaciones() {
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
                        .target("4")
                        .load();
        assertThat(anterior.migrate().migrationsExecuted).isEqualTo(4);
        UUID autor = UUID.randomUUID(),
                supervisor = UUID.randomUUID(),
                proveedor = UUID.randomUUID(),
                solicitud = UUID.randomUUID(),
                clave = UUID.randomUUID();
        for (var cuenta : Map.of("LEGADO", autor, "LEGADO_SUP", supervisor).entrySet())
            administrador.update(
                    "INSERT INTO gestion.usuarios(id,correo,nombre_visible,clave_hash,creado_en,actualizado_en) VALUES (?,?,?,'$argon2id$ficticio',?,?)",
                    cuenta.getValue(),
                    correo(cuenta.getKey()),
                    "Cuenta ficticia " + cuenta.getKey(),
                    Timestamp.from(AHORA.minusSeconds(5)),
                    Timestamp.from(AHORA.minusSeconds(5)));
        administrador.update(
                "INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES (?,'SOLICITANTE'),(?,'SUPERVISOR')",
                autor,
                supervisor);
        administrador.update(
                "INSERT INTO gestion.proveedores(id,tipo,denominacion,pais_fiscal,identificador_fiscal,identificador_fiscal_normalizado,creado_en,actualizado_en) VALUES (?,'PROFESIONAL','Proveedor legado','ES','LEGADO','LEGADO',?,?)",
                proveedor,
                Timestamp.from(AHORA.minusSeconds(5)),
                Timestamp.from(AHORA.minusSeconds(5)));
        administrador.update(
                "INSERT INTO gestion.solicitudes(id,numero,autor_id,proveedor_id,supervisor_id,asunto,moneda,estado,total,version,proveedor_denominacion,proveedor_pais_fiscal,proveedor_identificador_fiscal,proveedor_tipo,creado_en,actualizado_en,presentado_en) VALUES (?,'SOL-2026-999999',?,?,?,'Solicitud legada','EUR','PRESENTADA',10,2,'Proveedor legado','ES','LEGADO','PROFESIONAL',?,?,?)",
                solicitud,
                autor,
                proveedor,
                supervisor,
                Timestamp.from(AHORA.minusSeconds(5)),
                Timestamp.from(AHORA.minusSeconds(1)),
                Timestamp.from(AHORA.minusSeconds(1)));
        administrador.update(
                "INSERT INTO gestion.conceptos_solicitud(id,solicitud_id,descripcion,cantidad,unidad,precio_unitario,importe_linea,posicion) VALUES (?,?,'Concepto legado',1,'UNIDAD',10,10,1)",
                UUID.randomUUID(),
                solicitud);
        String huella =
                HexFormat.of()
                        .formatHex(
                                MessageDigest.getInstance("SHA-256")
                                        .digest(
                                                ("PRESENTAR:" + solicitud + ":1")
                                                        .getBytes(StandardCharsets.UTF_8)));
        administrador.update(
                "INSERT INTO gestion.operaciones_idempotentes_solicitud(usuario_id,clave,solicitud_id,operacion,huella,resultado_numero,resultado_estado,resultado_version,resultado_actualizado_en,resultado_presentado_en,resultado_moneda,resultado_total,creado_en) VALUES (?,?,?,'PRESENTAR',?,'SOL-2026-999999','PRESENTADA',2,?,?,'EUR',10,?)",
                autor,
                clave,
                solicitud,
                huella,
                Timestamp.from(AHORA.minusSeconds(1)),
                Timestamp.from(AHORA.minusSeconds(1)),
                Timestamp.from(AHORA.minusSeconds(1)));
        String filaAntes =
                administrador.queryForObject(
                        "SELECT to_jsonb(t)::text FROM gestion.solicitudes t WHERE id=?",
                        String.class,
                        solicitud);
        String operacionAntes =
                administrador.queryForObject(
                        "SELECT (to_jsonb(t)-'resultado_decidido_en'-'version_huella'-'recurso_id'-'proveedor_id'-'estado_http'-'resultado_json')::text FROM gestion.operaciones_idempotentes_solicitud t WHERE usuario_id=? AND clave=?",
                        String.class,
                        autor,
                        clave);
        iniciarAplicacion();
        assertThat(contexto.getBean(Flyway.class).info().applied()).hasSize(7);
        assertThat(contexto.getBean(Flyway.class).migrate().migrationsExecuted).isZero();
        assertThat(
                        administrador.queryForObject(
                                "SELECT to_jsonb(t)::text FROM gestion.solicitudes t WHERE id=?",
                                String.class,
                                solicitud))
                .isEqualTo(filaAntes);
        assertThat(
                        administrador.queryForObject(
                                "SELECT (to_jsonb(t)-'resultado_decidido_en'-'version_huella'-'recurso_id'-'proveedor_id'-'estado_http'-'resultado_json')::text FROM gestion.operaciones_idempotentes_solicitud t WHERE usuario_id=? AND clave=?",
                                String.class,
                                autor,
                                clave))
                .isEqualTo(operacionAntes);
        String hash = contexto.getBean(Contrasenas.class).codificar(CLAVE);
        administrador.update("UPDATE gestion.usuarios SET clave_hash=?", hash);
        actores.put("LEGADO", new ActorSolicitud(autor, Set.of(Rol.SOLICITANTE)));
        actores.put("LEGADO_SUP", new ActorSolicitud(supervisor, Set.of(Rol.SUPERVISOR)));
        for (Rol rol : Rol.values()) usuario(rol.name(), Set.of(rol), hash);
        usuario("OTRO_SUP", Set.of(Rol.SUPERVISOR), hash);
        usuario("MULTI", Set.of(Rol.SOLICITANTE, Rol.SUPERVISOR, Rol.ADMINISTRADOR), hash);
        usuario("AJENO", Set.of(Rol.SOLICITANTE), hash);
        autenticarTodos();
        cliente = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        obtenerCsrf();
        var replay =
                enviar(
                        "POST",
                        "/api/solicitudes/" + solicitud + "/presentar",
                        "{\"version\":1}",
                        "LEGADO",
                        true,
                        clave.toString());
        assertThat(replay.statusCode()).isEqualTo(200);
        var resultado = json.readTree(replay.body());
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
        assertThat(resultado.path("version").asLong()).isEqualTo(2);
        assertThat(resultado.path("importeTotal").asString()).isEqualTo("10.00");
        migracionVerificada = true;
        logger = (Logger) LoggerFactory.getLogger(ServicioSolicitudes.class);
        eventos = new ListAppender<>();
        eventos.start();
        logger.addAppender(eventos);
    }

    private void iniciarAplicacion() {
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
        origen =
                "http://127.0.0.1:"
                        + contexto.getEnvironment().getRequiredProperty("local.server.port");
        servicio = contexto.getBean(ServicioSolicitudes.class);
    }

    private void usuario(String nombre, Set<Rol> roles, String hash) {
        UUID id = UUID.randomUUID();
        new TransactionTemplate(contexto.getBean(PlatformTransactionManager.class))
                .executeWithoutResult(
                        tx ->
                                contexto.getBean(RepositorioIdentidad.class)
                                        .crearUsuario(
                                                id,
                                                correo(nombre),
                                                "Cuenta ficticia " + nombre,
                                                hash,
                                                roles,
                                                AHORA.minusSeconds(1)));
        actores.put(nombre, new ActorSolicitud(id, roles));
    }

    private static String correo(String nombre) {
        return nombre.toLowerCase(Locale.ROOT) + "@ejemplo.invalid";
    }

    private void autenticarTodos() {
        actores.keySet()
                .forEach(
                        nombre ->
                                tokens.put(
                                        nombre,
                                        contexto.getBean(ServicioAutenticacion.class)
                                                .iniciar(correo(nombre), CLAVE)
                                                .orElseThrow()
                                                .accessToken()));
    }

    private void obtenerCsrf() throws Exception {
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
    }

    @BeforeEach
    void limpiar() {
        administrador.execute(
                "TRUNCATE gestion.eventos_historial,gestion.decisiones_solicitud,gestion.operaciones_idempotentes_solicitud,gestion.conceptos_solicitud,gestion.solicitudes,gestion.proveedores");
        administrador.execute("UPDATE gestion.usuarios SET habilitado=true");
        actores.forEach(
                (nombre, actor) -> {
                    administrador.update(
                            "UPDATE gestion.usuarios SET nombre_visible=? WHERE id=?",
                            "Cuenta ficticia " + nombre,
                            actor.id());
                    actor.roles()
                            .forEach(
                                    rol ->
                                            administrador.update(
                                                    "INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES (?,?) ON CONFLICT DO NOTHING",
                                                    actor.id(),
                                                    rol.name()));
                });
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
    void migracionV4ConFilasYResultadoLegadoPreservados() {
        assertThat(migracionVerificada).isTrue();
    }

    @Test
    void aprobarResultadoMinimoEventoYAgregadoInmutable() throws Exception {
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        var antes = detalle(s.id(), "SOLICITANTE");
        UUID clave = UUID.randomUUID();
        var r = decidir(s, "SUPERVISOR", "aprobar", "  Aprobación ficticia  ", clave, s.version());
        assertThat(r.statusCode()).isEqualTo(200);
        var resultado = json.readTree(r.body());
        assertThat(resultado.propertyNames())
                .containsExactlyInAnyOrder(
                        "id", "numero", "estado", "version", "actualizadoEn", "decididoEn");
        assertThat(resultado.path("estado").asString()).isEqualTo("APROBADA");
        assertThat(resultado.path("version").asLong()).isEqualTo(s.version() + 1);
        assertThat(resultado.path("actualizadoEn")).isEqualTo(resultado.path("decididoEn"));
        var despues = detalle(s.id(), "SOLICITANTE");
        assertThat(despues.path("decision").propertyNames())
                .containsExactlyInAnyOrder("tipo", "actor", "comentario", "motivo", "decididoEn");
        assertThat(despues.path("decision").path("tipo").asString()).isEqualTo("APROBAR");
        assertThat(despues.path("decision").path("comentario").asString())
                .isEqualTo("Aprobación ficticia");
        assertThat(despues.path("decision").path("motivo").isNull()).isTrue();
        assertThat(despues.path("decision").path("actor").propertyNames())
                .containsExactlyInAnyOrder("id", "nombreVisible");
        for (String campo :
                List.of(
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
                        "importeTotal",
                        "creadoEn",
                        "presentadoEn",
                        "conceptos"))
            assertThat(despues.path(campo)).as(campo + " inmutable").isEqualTo(antes.path(campo));
        assertThat(
                        administrador.queryForObject(
                                "SELECT version_resultante-version_anterior FROM gestion.decisiones_solicitud WHERE solicitud_id=?",
                                Long.class,
                                s.id()))
                .isEqualTo(1);
        assertThat(cuenta("decisiones_solicitud")).isEqualTo(1);
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isEqualTo(2);
    }

    @Test
    void rechazarMotivoVisibleSoloEnDetalleAutorizado() throws Exception {
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        assertThat(
                        decidir(
                                        s,
                                        "SUPERVISOR",
                                        "rechazar",
                                        "  Motivo ficticio suficiente  ",
                                        UUID.randomUUID(),
                                        s.version())
                                .statusCode())
                .isEqualTo(200);
        for (String lector : List.of("SOLICITANTE", "SUPERVISOR", "AUDITOR", "ADMINISTRADOR")) {
            var d = detalle(s.id(), lector);
            assertThat(d.path("estado").asString()).isEqualTo("RECHAZADA");
            assertThat(d.path("decision").path("motivo").asString())
                    .isEqualTo("Motivo ficticio suficiente");
            assertThat(d.path("decision").path("comentario").isNull()).isTrue();
            var resumen = pagina("?numero=" + s.numero(), lector).path("elementos").get(0);
            assertThat(resumen.has("decision")).isFalse();
            assertThat(resumen.has("motivo")).isFalse();
            assertThat(resumen.path("decididoEn").isString()).isTrue();
        }
        for (String lector : List.of("AJENO", "OTRO_SUP"))
            error(
                    enviar("GET", "/api/solicitudes/" + s.id(), null, lector, false, null),
                    404,
                    "SOLICITUD_NO_ENCONTRADA");
    }

    @Test
    void comentarioYMotivoLimitesUnicodeHttp() throws Exception {
        var a = presentada("SOLICITANTE", "SUPERVISOR");
        assertThat(
                        decidir(
                                        a,
                                        "SUPERVISOR",
                                        "aprobar",
                                        "😀".repeat(500),
                                        UUID.randomUUID(),
                                        a.version())
                                .statusCode())
                .isEqualTo(200);
        var b = presentada("SOLICITANTE", "SUPERVISOR");
        assertThat(
                        decidir(
                                        b,
                                        "SUPERVISOR",
                                        "rechazar",
                                        "😀".repeat(1000),
                                        UUID.randomUUID(),
                                        b.version())
                                .statusCode())
                .isEqualTo(200);
        var c = presentada("SOLICITANTE", "SUPERVISOR");
        for (String texto : List.of("x".repeat(501)))
            error(
                    decidir(c, "SUPERVISOR", "aprobar", texto, UUID.randomUUID(), c.version()),
                    400,
                    "SOLICITUD_INVALIDA");
        // Enviar escapes JSON conserva el caso inválido; BodyPublisher reemplaza surrogates
        // literales no emparejados por '?' al codificar UTF-8, que es un comentario válido.
        for (String texto : List.of("abc\\ud800", "abc\\udc00"))
            error(
                    enviar(
                            "POST",
                            "/api/solicitudes/" + c.id() + "/aprobar",
                            "{\"version\":" + c.version() + ",\"comentario\":\"" + texto + "\"}",
                            "SUPERVISOR",
                            true,
                            UUID.randomUUID().toString()),
                    400,
                    "SOLICITUD_INVALIDA");
        for (String texto : List.of("", "123456789", "x".repeat(1001)))
            error(
                    decidir(c, "SUPERVISOR", "rechazar", texto, UUID.randomUUID(), c.version()),
                    400,
                    "SOLICITUD_INVALIDA");
        assertThat(detalle(c.id(), "SUPERVISOR").path("estado").asString()).isEqualTo("PRESENTADA");
    }

    @Test
    void entradasExtraTiposVersionEIdempotencyKeyInvalidos() throws Exception {
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        for (String entrada :
                List.of(
                        "null",
                        "[]",
                        "{}",
                        "{",
                        "{\"version\":-1}",
                        "{\"version\":2.0}",
                        "{\"version\":\"2\"}",
                        "{\"version\":2,\"comentario\":4}",
                        "{\"version\":2,\"motivo\":\"No permitido\"}",
                        "{\"version\":2,\"estado\":\"APROBADA\"}",
                        "{\"version\":2,\"actor\":\"falso\"}"))
            error(
                    enviar(
                            "POST",
                            "/api/solicitudes/" + s.id() + "/aprobar",
                            entrada,
                            "SUPERVISOR",
                            true,
                            UUID.randomUUID().toString()),
                    400,
                    "SOLICITUD_INVALIDA");
        for (String entrada :
                List.of(
                        "{\"version\":2}",
                        "{\"version\":2,\"motivo\":null}",
                        "{\"version\":2,\"motivo\":false}",
                        "{\"version\":2,\"motivo\":\"Motivo ficticio\",\"comentario\":null}"))
            error(
                    enviar(
                            "POST",
                            "/api/solicitudes/" + s.id() + "/rechazar",
                            entrada,
                            "SUPERVISOR",
                            true,
                            UUID.randomUUID().toString()),
                    400,
                    "SOLICITUD_INVALIDA");
        for (String clave : Arrays.asList(null, "", "1-1-1-1-1", "invalida"))
            error(
                    enviar(
                            "POST",
                            "/api/solicitudes/" + s.id() + "/aprobar",
                            "{\"version\":2}",
                            "SUPERVISOR",
                            true,
                            clave),
                    400,
                    "SOLICITUD_INVALIDA");
        assertThat(cuenta("decisiones_solicitud")).isZero();
    }

    @Test
    void permisosCsrfAsignacionYPropiaMultirrol() throws Exception {
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        String ruta = "/api/solicitudes/" + s.id() + "/aprobar";
        error(
                enviar("POST", ruta, "{\"version\":2}", null, true, UUID.randomUUID().toString()),
                401,
                "NO_AUTENTICADO");
        error(
                enviar(
                        "POST",
                        ruta,
                        "{\"version\":2}",
                        "SUPERVISOR",
                        false,
                        UUID.randomUUID().toString()),
                403,
                "ACCESO_NO_PERMITIDO");
        for (String actor : List.of("SOLICITANTE", "AUDITOR", "ADMINISTRADOR"))
            error(
                    decidir(s, actor, "aprobar", null, UUID.randomUUID(), s.version()),
                    403,
                    "ACCESO_NO_PERMITIDO");
        error(
                decidir(s, "OTRO_SUP", "aprobar", null, UUID.randomUUID(), s.version()),
                404,
                "SOLICITUD_NO_ENCONTRADA");
        error(
                decidir(s, "MULTI", "aprobar", null, UUID.randomUUID(), s.version()),
                403,
                "ACCESO_NO_PERMITIDO");
        var propia = presentada("MULTI", "SUPERVISOR");
        error(
                decidir(propia, "MULTI", "aprobar", null, UUID.randomUUID(), propia.version()),
                403,
                "ACCESO_NO_PERMITIDO");
        var borrador =
                servicio.crear(
                        actores.get("MULTI"), "Propia con autor supervisor", UUID.randomUUID());
        administrador.update(
                "UPDATE gestion.solicitudes SET supervisor_id=autor_id WHERE id=?", borrador.id());
        error(
                decidir(borrador, "MULTI", "aprobar", null, UUID.randomUUID(), 0),
                403,
                "ACCESO_NO_PERMITIDO");
        assertThat(cuenta("decisiones_solicitud")).isZero();
    }

    @Test
    void estadosFinalesYBorradorNoDecidiblesVersionPosteriorAlEstado() throws Exception {
        var borrador = borrador("SOLICITANTE", "MULTI");
        error(
                decidir(borrador, "MULTI", "aprobar", null, UUID.randomUUID(), 0),
                409,
                "SOLICITUD_NO_DECIDIBLE");
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        error(
                decidir(s, "SUPERVISOR", "aprobar", null, UUID.randomUUID(), 0),
                409,
                "VERSION_OBSOLETA");
        decidir(s, "SUPERVISOR", "aprobar", null, UUID.randomUUID(), s.version());
        error(
                decidir(s, "SUPERVISOR", "rechazar", "Motivo ficticio", UUID.randomUUID(), 0),
                409,
                "SOLICITUD_NO_DECIDIBLE");
        var r = presentada("SOLICITANTE", "SUPERVISOR");
        decidir(r, "SUPERVISOR", "rechazar", "Motivo ficticio", UUID.randomUUID(), r.version());
        error(
                decidir(r, "SUPERVISOR", "aprobar", null, UUID.randomUUID(), r.version() + 1),
                409,
                "SOLICITUD_NO_DECIDIBLE");
    }

    @Test
    void replayNormalizaAusenteNullVacioYTexto() throws Exception {
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        UUID clave = UUID.randomUUID();
        String ruta = "/api/solicitudes/" + s.id() + "/aprobar";
        var original =
                enviar("POST", ruta, "{\"version\":2}", "SUPERVISOR", true, clave.toString());
        assertThat(original.statusCode()).isEqualTo(200);
        for (String cuerpo :
                List.of(
                        "{\"version\":2,\"comentario\":null}",
                        "{\"version\":2,\"comentario\":\" \"}",
                        "{\"version\":2,\"comentario\":\"\"}"))
            assertThat(enviar("POST", ruta, cuerpo, "SUPERVISOR", true, clave.toString()).body())
                    .isEqualTo(original.body());
        var r = presentada("SOLICITANTE", "SUPERVISOR");
        UUID otra = UUID.randomUUID();
        var rechazo = decidir(r, "SUPERVISOR", "rechazar", " Motivo ficticio ", otra, r.version());
        assertThat(
                        decidir(r, "SUPERVISOR", "rechazar", "Motivo ficticio", otra, r.version())
                                .body())
                .isEqualTo(rechazo.body());
        assertThat(cuenta("decisiones_solicitud")).isEqualTo(2);
    }

    @Test
    void claveIncompatibleOperacionCuerpoVersionYRecurso() throws Exception {
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        var otra = presentada("SOLICITANTE", "SUPERVISOR");
        UUID clave = UUID.randomUUID();
        decidir(s, "SUPERVISOR", "aprobar", "Comentario uno", clave, s.version());
        error(
                decidir(s, "SUPERVISOR", "rechazar", "Motivo ficticio", clave, s.version()),
                409,
                "CLAVE_IDEMPOTENCIA_REUTILIZADA");
        error(
                decidir(s, "SUPERVISOR", "aprobar", "Comentario dos", clave, s.version()),
                409,
                "CLAVE_IDEMPOTENCIA_REUTILIZADA");
        error(
                decidir(s, "SUPERVISOR", "aprobar", "Comentario uno", clave, s.version() + 1),
                409,
                "CLAVE_IDEMPOTENCIA_REUTILIZADA");
        error(
                decidir(otra, "SUPERVISOR", "aprobar", "Comentario uno", clave, otra.version()),
                409,
                "CLAVE_IDEMPOTENCIA_REUTILIZADA");
        assertThat(cuenta("decisiones_solicitud")).isEqualTo(1);
    }

    @Test
    void claveCompartidaConPresentarEnAmbosSentidos() throws Exception {
        UUID clave = UUID.randomUUID();
        var propia = borrador("MULTI", "SUPERVISOR");
        servicio.presentar(
                actores.get("MULTI"), propia.id(), propia.version(), clave, UUID.randomUUID());
        var asignada = presentada("SOLICITANTE", "MULTI");
        error(
                decidir(asignada, "MULTI", "aprobar", null, clave, asignada.version()),
                409,
                "CLAVE_IDEMPOTENCIA_REUTILIZADA");
        UUID claveDecision = UUID.randomUUID();
        assertThat(
                        decidir(
                                        asignada,
                                        "MULTI",
                                        "aprobar",
                                        null,
                                        claveDecision,
                                        asignada.version())
                                .statusCode())
                .isEqualTo(200);
        var otra = borrador("MULTI", "SUPERVISOR");
        error(
                enviar(
                        "POST",
                        "/api/solicitudes/" + otra.id() + "/presentar",
                        "{\"version\":" + otra.version() + "}",
                        "MULTI",
                        true,
                        claveDecision.toString()),
                409,
                "CLAVE_IDEMPOTENCIA_REUTILIZADA");
    }

    @Test
    void replay004TrasDecidirPermaneceExacto() throws Exception {
        var s = borrador("SOLICITANTE", "SUPERVISOR");
        UUID clave = UUID.randomUUID();
        String ruta = "/api/solicitudes/" + s.id() + "/presentar";
        String cuerpo = "{\"version\":" + s.version() + "}";
        var original = enviar("POST", ruta, cuerpo, "SOLICITANTE", true, clave.toString());
        assertThat(original.statusCode()).isEqualTo(200);
        var actual = servicio.consultar(actores.get("SOLICITANTE"), s.id());
        assertThat(
                        decidir(
                                        actual,
                                        "SUPERVISOR",
                                        "aprobar",
                                        null,
                                        UUID.randomUUID(),
                                        actual.version())
                                .statusCode())
                .isEqualTo(200);
        assertThat(enviar("POST", ruta, cuerpo, "SOLICITANTE", true, clave.toString()).body())
                .isEqualTo(original.body());
        assertThat(detalle(s.id(), "SOLICITANTE").path("estado").asString()).isEqualTo("APROBADA");
    }

    @Test
    void rolRetiradoInvalidaDecisionYReplayConJwtVigente() throws Exception {
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        UUID clave = UUID.randomUUID();
        decidir(s, "SUPERVISOR", "aprobar", null, clave, s.version());
        var otra = presentada("SOLICITANTE", "SUPERVISOR");
        administrador.update(
                "DELETE FROM gestion.usuarios_roles WHERE usuario_id=? AND rol='SUPERVISOR'",
                actores.get("SUPERVISOR").id());
        error(
                decidir(s, "SUPERVISOR", "aprobar", null, clave, s.version()),
                403,
                "ACCESO_NO_PERMITIDO");
        error(
                decidir(otra, "SUPERVISOR", "aprobar", null, UUID.randomUUID(), otra.version()),
                403,
                "ACCESO_NO_PERMITIDO");
        assertThat(cuenta("decisiones_solicitud")).isEqualTo(1);
    }

    @Test
    void usuarioDeshabilitado401YServicioDeniegaAntesDelReplay() throws Exception {
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        UUID clave = UUID.randomUUID();
        decidir(s, "SUPERVISOR", "aprobar", null, clave, s.version());
        administrador.update(
                "UPDATE gestion.usuarios SET habilitado=false WHERE id=?",
                actores.get("SUPERVISOR").id());
        error(decidir(s, "SUPERVISOR", "aprobar", null, clave, s.version()), 401, "NO_AUTENTICADO");
        assertThatThrownBy(
                        () ->
                                servicio.decidir(
                                        actores.get("SUPERVISOR"),
                                        s.id(),
                                        s.version(),
                                        clave,
                                        new DatosDecision(DatosDecision.Tipo.APROBAR, null, null),
                                        UUID.randomUUID()))
                .hasMessage("ACCESO_NO_PERMITIDO");
    }

    @Test
    void nombreActorFotografiadoYProveedorInactivoNoImpideDecision() throws Exception {
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        administrador.update(
                "UPDATE gestion.proveedores SET activo=false,denominacion='Catálogo cambiado' WHERE id=?",
                s.proveedorId());
        assertThat(
                        decidir(s, "SUPERVISOR", "aprobar", null, UUID.randomUUID(), s.version())
                                .statusCode())
                .isEqualTo(200);
        administrador.update(
                "UPDATE gestion.usuarios SET nombre_visible='Nombre posterior' WHERE id=?",
                s.supervisorId());
        var detalle = detalle(s.id(), "SOLICITANTE");
        assertThat(detalle.path("decision").path("actor").path("nombreVisible").asString())
                .isEqualTo("Cuenta ficticia SUPERVISOR");
        assertThat(detalle.path("proveedor").path("denominacion").asString())
                .isEqualTo("Proveedor ficticio005");
    }

    @Test
    void bandejaYFinalesAplicanAsignacionAntesConteo() throws Exception {
        var pendiente = presentada("SOLICITANTE", "SUPERVISOR");
        var aprobada = presentada("SOLICITANTE", "SUPERVISOR");
        var rechazada = presentada("SOLICITANTE", "SUPERVISOR");
        presentada("SOLICITANTE", "OTRO_SUP");
        borrador("SOLICITANTE", "SUPERVISOR");
        decidir(aprobada, "SUPERVISOR", "aprobar", null, UUID.randomUUID(), aprobada.version());
        decidir(
                rechazada,
                "SUPERVISOR",
                "rechazar",
                "Motivo ficticio",
                UUID.randomUUID(),
                rechazada.version());
        var bandeja =
                pagina(
                        "?supervisor=" + pendiente.supervisorId() + "&estado=PRESENTADA",
                        "SUPERVISOR");
        assertThat(bandeja.path("totalElementos").asLong()).isEqualTo(1);
        assertThat(bandeja.path("elementos").get(0).path("id").asString())
                .isEqualTo(pendiente.id().toString());
        assertThat(pagina("", "SUPERVISOR").path("totalElementos").asLong()).isEqualTo(3);
        assertThat(pagina("?estado=APROBADA", "SUPERVISOR").path("totalElementos").asLong())
                .isEqualTo(1);
        assertThat(pagina("?estado=RECHAZADA", "SUPERVISOR").path("totalElementos").asLong())
                .isEqualTo(1);
        assertThat(pagina("?estado=APROBADA", "OTRO_SUP").path("totalElementos").asLong()).isZero();
    }

    @Test
    void rollbackTrasEstadoAntesEventoYReintentoMismaClave() throws Exception {
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        var anterior = detalle(s.id(), "SUPERVISOR");
        UUID clave = UUID.randomUUID();
        administrador.execute(
                "CREATE FUNCTION gestion.fallo_evento005() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fallo ficticio evento005'; END $$");
        administrador.execute(
                "CREATE TRIGGER fallo_evento005 BEFORE INSERT ON gestion.decisiones_solicitud FOR EACH ROW EXECUTE FUNCTION gestion.fallo_evento005()");
        eventos.list.clear();
        try {
            error(
                    decidir(s, "SUPERVISOR", "aprobar", "Comentario ficticio", clave, s.version()),
                    500,
                    "ERROR_INTERNO");
            assertThat(detalle(s.id(), "SUPERVISOR")).isEqualTo(anterior);
            assertThat(cuenta("decisiones_solicitud")).isZero();
            assertThat(cuenta("operaciones_idempotentes_solicitud")).isEqualTo(1);
            assertThat(eventos.list)
                    .noneMatch(e -> e.getFormattedMessage().contains("resultado=CORRECTO"));
        } finally {
            administrador.execute("DROP TRIGGER fallo_evento005 ON gestion.decisiones_solicitud");
            administrador.execute("DROP FUNCTION gestion.fallo_evento005()");
        }
        assertThat(
                        decidir(
                                        s,
                                        "SUPERVISOR",
                                        "aprobar",
                                        "Comentario ficticio",
                                        clave,
                                        s.version())
                                .statusCode())
                .isEqualTo(200);
    }

    @Test
    void rollbackTrasEventoAntesIdempotenciaYReintentoMismaClave() throws Exception {
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        var anterior = detalle(s.id(), "SUPERVISOR");
        UUID clave = UUID.randomUUID();
        administrador.execute(
                "CREATE FUNCTION gestion.fallo_resultado005() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fallo ficticio resultado005'; END $$");
        administrador.execute(
                "CREATE TRIGGER fallo_resultado005 BEFORE INSERT ON gestion.operaciones_idempotentes_solicitud FOR EACH ROW EXECUTE FUNCTION gestion.fallo_resultado005()");
        eventos.list.clear();
        try {
            error(
                    decidir(
                            s,
                            "SUPERVISOR",
                            "rechazar",
                            "Motivo ficticio suficiente",
                            clave,
                            s.version()),
                    500,
                    "ERROR_INTERNO");
            assertThat(detalle(s.id(), "SUPERVISOR")).isEqualTo(anterior);
            assertThat(cuenta("decisiones_solicitud")).isZero();
            assertThat(cuenta("operaciones_idempotentes_solicitud")).isEqualTo(1);
            assertThat(eventos.list)
                    .noneMatch(e -> e.getFormattedMessage().contains("resultado=CORRECTO"));
        } finally {
            administrador.execute(
                    "DROP TRIGGER fallo_resultado005 ON gestion.operaciones_idempotentes_solicitud");
            administrador.execute("DROP FUNCTION gestion.fallo_resultado005()");
        }
        assertThat(
                        decidir(
                                        s,
                                        "SUPERVISOR",
                                        "rechazar",
                                        "Motivo ficticio suficiente",
                                        clave,
                                        s.version())
                                .statusCode())
                .isEqualTo(200);
    }

    @Test
    void carrerasAprobarAprobarRechazarRechazarYAprobarRechazar() throws Exception {
        for (List<String> operaciones :
                List.of(
                        List.of("aprobar", "aprobar"),
                        List.of("rechazar", "rechazar"),
                        List.of("aprobar", "rechazar"))) {
            var s = presentada("SOLICITANTE", "SUPERVISOR");
            try (var bloqueo =
                            bloquear(
                                    "SELECT id FROM gestion.solicitudes WHERE id=? FOR UPDATE",
                                    s.id());
                    var hilos = Executors.newFixedThreadPool(2)) {
                var a =
                        hilos.submit(
                                () ->
                                        decidir(
                                                s,
                                                "SUPERVISOR",
                                                operaciones.get(0),
                                                "Texto ficticio suficiente",
                                                UUID.randomUUID(),
                                                s.version()));
                var b =
                        hilos.submit(
                                () ->
                                        decidir(
                                                s,
                                                "SUPERVISOR",
                                                operaciones.get(1),
                                                "Texto ficticio suficiente",
                                                UUID.randomUUID(),
                                                s.version()));
                esperarBloqueos(2);
                bloqueo.commit();
                var resultados = List.of(a.get(10, TimeUnit.SECONDS), b.get(10, TimeUnit.SECONDS));
                assertThat(resultados)
                        .extracting(HttpResponse::statusCode)
                        .containsExactlyInAnyOrder(200, 409);
                error(
                        resultados.stream()
                                .filter(r -> r.statusCode() == 409)
                                .findFirst()
                                .orElseThrow(),
                        409,
                        "SOLICITUD_NO_DECIDIBLE");
            }
            assertThat(
                            administrador.queryForObject(
                                    "SELECT count(*) FROM gestion.decisiones_solicitud WHERE solicitud_id=?",
                                    Integer.class,
                                    s.id()))
                    .isEqualTo(1);
            assertThat(servicio.consultar(actores.get("SUPERVISOR"), s.id()).version())
                    .isEqualTo(3);
        }
    }

    @Test
    void mismaClaveConcurrenteCompatibleReplayExactoParaAmbasDecisiones() throws Exception {
        for (String operacion : List.of("aprobar", "rechazar")) {
            var s = presentada("SOLICITANTE", "SUPERVISOR");
            UUID clave = UUID.randomUUID();
            try (var bloqueo =
                            bloquear(
                                    "SELECT id FROM gestion.solicitudes WHERE id=? FOR UPDATE",
                                    s.id());
                    var hilos = Executors.newFixedThreadPool(2)) {
                var a =
                        hilos.submit(
                                () ->
                                        decidir(
                                                s,
                                                "SUPERVISOR",
                                                operacion,
                                                "Texto ficticio suficiente",
                                                clave,
                                                s.version()));
                var b =
                        hilos.submit(
                                () ->
                                        decidir(
                                                s,
                                                "SUPERVISOR",
                                                operacion,
                                                "Texto ficticio suficiente",
                                                clave,
                                                s.version()));
                esperarBloqueos(2);
                bloqueo.commit();
                var ra = a.get(10, TimeUnit.SECONDS);
                var rb = b.get(10, TimeUnit.SECONDS);
                assertThat(ra.statusCode()).isEqualTo(200);
                assertThat(rb.statusCode()).isEqualTo(200);
                assertThat(ra.body()).isEqualTo(rb.body());
            }
            assertThat(
                            administrador.queryForObject(
                                    "SELECT count(*) FROM gestion.decisiones_solicitud WHERE solicitud_id=?",
                                    Integer.class,
                                    s.id()))
                    .isEqualTo(1);
        }
    }

    @Test
    void mismaClaveConcurrenteOperacionesIncompatibles() throws Exception {
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        UUID clave = UUID.randomUUID();
        try (var bloqueo =
                        bloquear(
                                "SELECT id FROM gestion.solicitudes WHERE id=? FOR UPDATE",
                                s.id());
                var hilos = Executors.newFixedThreadPool(2)) {
            var a =
                    hilos.submit(
                            () ->
                                    decidir(
                                            s,
                                            "SUPERVISOR",
                                            "aprobar",
                                            "Texto ficticio suficiente",
                                            clave,
                                            s.version()));
            var b =
                    hilos.submit(
                            () ->
                                    decidir(
                                            s,
                                            "SUPERVISOR",
                                            "rechazar",
                                            "Texto ficticio suficiente",
                                            clave,
                                            s.version()));
            esperarBloqueos(2);
            bloqueo.commit();
            var resultados = List.of(a.get(10, TimeUnit.SECONDS), b.get(10, TimeUnit.SECONDS));
            assertThat(resultados)
                    .extracting(HttpResponse::statusCode)
                    .containsExactlyInAnyOrder(200, 409);
            error(
                    resultados.stream()
                            .filter(r -> r.statusCode() == 409)
                            .findFirst()
                            .orElseThrow(),
                    409,
                    "CLAVE_IDEMPOTENCIA_REUTILIZADA");
        }
        assertThat(cuenta("decisiones_solicitud")).isEqualTo(1);
    }

    @Test
    void mismaClaveConcurrenteEntreRecursos() throws Exception {
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        var otra = presentada("SOLICITANTE", "SUPERVISOR");
        UUID clave = UUID.randomUUID();
        try (var bloqueo =
                        bloquear(
                                "SELECT id FROM gestion.solicitudes WHERE id=? FOR UPDATE",
                                s.id());
                var hilos = Executors.newFixedThreadPool(2)) {
            var a =
                    hilos.submit(
                            () -> decidir(s, "SUPERVISOR", "aprobar", null, clave, s.version()));
            esperarBloqueos(1);
            var b =
                    hilos.submit(
                            () ->
                                    decidir(
                                            otra,
                                            "SUPERVISOR",
                                            "aprobar",
                                            null,
                                            clave,
                                            otra.version()));
            esperarBloqueos(2);
            bloqueo.commit();
            assertThat(a.get(10, TimeUnit.SECONDS).statusCode()).isEqualTo(200);
            error(b.get(10, TimeUnit.SECONDS), 409, "CLAVE_IDEMPOTENCIA_REUTILIZADA");
        }
        assertThat(cuenta("decisiones_solicitud")).isEqualTo(1);
        assertThat(detalle(otra.id(), "SUPERVISOR").path("estado").asString())
                .isEqualTo("PRESENTADA");
    }

    @Test
    void retiradaRolConcurrenteAntesDecisionYReplayDeniega403() throws Exception {
        for (boolean replay : List.of(false, true)) {
            administrador.update(
                    "INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES (?,'SUPERVISOR') ON CONFLICT DO NOTHING",
                    actores.get("SUPERVISOR").id());
            var s = presentada("SOLICITANTE", "SUPERVISOR");
            UUID clave = UUID.randomUUID();
            if (replay)
                assertThat(
                                decidir(s, "SUPERVISOR", "aprobar", null, clave, s.version())
                                        .statusCode())
                        .isEqualTo(200);
            try (var bloqueo =
                            bloquear(
                                    "SELECT usuario_id FROM gestion.usuarios_roles WHERE usuario_id=? AND rol='SUPERVISOR' FOR UPDATE",
                                    s.supervisorId());
                    var hilos = Executors.newSingleThreadExecutor()) {
                try (var sentencia =
                        bloqueo.prepareStatement(
                                "DELETE FROM gestion.usuarios_roles WHERE usuario_id=? AND rol='SUPERVISOR'")) {
                    sentencia.setObject(1, s.supervisorId());
                    sentencia.executeUpdate();
                }
                var futura =
                        hilos.submit(
                                () ->
                                        decidir(
                                                s,
                                                "SUPERVISOR",
                                                "aprobar",
                                                null,
                                                clave,
                                                s.version()));
                esperarBloqueos(1);
                bloqueo.commit();
                error(futura.get(10, TimeUnit.SECONDS), 403, "ACCESO_NO_PERMITIDO");
            }
            assertThat(
                            administrador.queryForObject(
                                    "SELECT count(*) FROM gestion.decisiones_solicitud WHERE solicitud_id=?",
                                    Integer.class,
                                    s.id()))
                    .isEqualTo(replay ? 1 : 0);
        }
    }

    @Test
    void decisionMantieneRolBloqueadoHastaCommitYReplayPosteriorRevocado() throws Exception {
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        UUID clave = UUID.randomUUID();
        administrador.execute(
                "CREATE FUNCTION gestion.esperar_evento005() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(-50051234); RETURN NEW; END $$");
        administrador.execute(
                "CREATE TRIGGER esperar_evento005 BEFORE INSERT ON gestion.decisiones_solicitud FOR EACH ROW EXECUTE FUNCTION gestion.esperar_evento005()");
        try (var bloqueo = conexionAdmin();
                var hilos = Executors.newFixedThreadPool(2)) {
            bloqueo.setAutoCommit(false);
            try (var sql = bloqueo.createStatement()) {
                sql.execute("SELECT pg_advisory_xact_lock(-50051234)");
            }
            var decidir =
                    hilos.submit(
                            () -> decidir(s, "SUPERVISOR", "aprobar", null, clave, s.version()));
            esperarBloqueos(1);
            var retirar =
                    hilos.submit(
                            () ->
                                    administrador.update(
                                            "DELETE FROM gestion.usuarios_roles WHERE usuario_id=? AND rol='SUPERVISOR'",
                                            s.supervisorId()));
            esperarConsultaBloqueada("DELETE FROM gestion.usuarios_roles%");
            bloqueo.commit();
            assertThat(decidir.get(10, TimeUnit.SECONDS).statusCode()).isEqualTo(200);
            assertThat(retirar.get(10, TimeUnit.SECONDS)).isEqualTo(1);
        } finally {
            administrador.execute("DROP TRIGGER esperar_evento005 ON gestion.decisiones_solicitud");
            administrador.execute("DROP FUNCTION gestion.esperar_evento005()");
        }
        error(
                decidir(s, "SUPERVISOR", "aprobar", null, clave, s.version()),
                403,
                "ACCESO_NO_PERMITIDO");
    }

    @Test
    void replayPersistidoDespuesDeReiniciarLaAplicacion() throws Exception {
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        UUID clave = UUID.randomUUID();
        var original =
                decidir(
                        s,
                        "SUPERVISOR",
                        "rechazar",
                        "Motivo tras reinicio ficticio",
                        clave,
                        s.version());
        assertThat(original.statusCode()).isEqualTo(200);
        contexto.close();
        iniciarAplicacion();
        autenticarTodos();
        obtenerCsrf();
        assertThat(contexto.getBean(Flyway.class).info().applied()).hasSize(7);
        assertThat(contexto.getBean(Flyway.class).migrate().migrationsExecuted).isZero();
        var replay =
                decidir(
                        s,
                        "SUPERVISOR",
                        "rechazar",
                        "Motivo tras reinicio ficticio",
                        clave,
                        s.version());
        assertThat(replay.statusCode()).isEqualTo(200);
        assertThat(replay.body()).isEqualTo(original.body());
        assertThat(cuenta("decisiones_solicitud")).isEqualTo(1);
    }

    @Test
    void eventoPrivilegiosFkUniqueTextosYVersiones() throws Exception {
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        decidir(
                s,
                "SUPERVISOR",
                "rechazar",
                "Motivo ficticio suficiente",
                UUID.randomUUID(),
                s.version());
        try (var conexion =
                        DriverManager.getConnection(
                                base.getJdbcUrl(), "gestion_app", "aplicacion-ficticia-prueba");
                var sql = conexion.createStatement()) {
            for (String sentencia :
                    List.of(
                            "DELETE FROM gestion.decisiones_solicitud",
                            "UPDATE gestion.decisiones_solicitud SET motivo='Cambio no permitido'",
                            "TRUNCATE gestion.decisiones_solicitud",
                            "ALTER TABLE gestion.decisiones_solicitud ADD COLUMN prohibida text"))
                assertThatThrownBy(() -> sql.execute(sentencia))
                        .isInstanceOf(SQLException.class)
                        .satisfies(
                                e ->
                                        assertThat(((SQLException) e).getSQLState())
                                                .isEqualTo("42501"));
            try (var filas =
                    sql.executeQuery("SELECT count(*) FROM gestion.decisiones_solicitud")) {
                assertThat(filas.next()).isTrue();
                assertThat(filas.getInt(1)).isEqualTo(1);
            }
        }
        try (var conexion = conexionAdmin();
                var sql = conexion.createStatement()) {
            for (String sentencia :
                    List.of(
                            "UPDATE gestion.decisiones_solicitud SET tipo='OTRO'",
                            "UPDATE gestion.decisiones_solicitud SET motivo=NULL",
                            "UPDATE gestion.decisiones_solicitud SET motivo='corto'",
                            "UPDATE gestion.decisiones_solicitud SET comentario='Incompatible'",
                            "UPDATE gestion.decisiones_solicitud SET version_resultante=version_anterior",
                            "UPDATE gestion.decisiones_solicitud SET version_anterior=-1",
                            "UPDATE gestion.decisiones_solicitud SET actor_nombre_visible=''"))
                assertThatThrownBy(() -> sql.execute(sentencia))
                        .isInstanceOf(SQLException.class)
                        .satisfies(
                                e ->
                                        assertThat(((SQLException) e).getSQLState())
                                                .isEqualTo("23514"));
        }
        assertThatThrownBy(
                        () ->
                                administrador.update(
                                        "INSERT INTO gestion.decisiones_solicitud SELECT ?,solicitud_id,actor_id,actor_nombre_visible,tipo,comentario,motivo,decidido_en,version_anterior,version_resultante,peticion_id FROM gestion.decisiones_solicitud",
                                        UUID.randomUUID()))
                .isInstanceOf(org.springframework.dao.DuplicateKeyException.class);
        assertThatThrownBy(
                        () ->
                                administrador.update(
                                        "UPDATE gestion.decisiones_solicitud SET actor_id=?",
                                        UUID.randomUUID()))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test
    void idempotenciaCheckDistinguePresentacionDecisionYFechas() throws Exception {
        var s = presentada("SOLICITANTE", "SUPERVISOR");
        decidir(s, "SUPERVISOR", "aprobar", null, UUID.randomUUID(), s.version());
        try (var conexion = conexionAdmin();
                var sql = conexion.createStatement()) {
            for (String sentencia :
                    List.of(
                            "UPDATE gestion.operaciones_idempotentes_solicitud SET resultado_decidido_en=NULL WHERE operacion='APROBAR'",
                            "UPDATE gestion.operaciones_idempotentes_solicitud SET resultado_estado='RECHAZADA' WHERE operacion='APROBAR'",
                            "UPDATE gestion.operaciones_idempotentes_solicitud SET resultado_decidido_en=resultado_presentado_en-interval '1 second',resultado_actualizado_en=resultado_presentado_en-interval '1 second' WHERE operacion='APROBAR'",
                            "UPDATE gestion.operaciones_idempotentes_solicitud SET resultado_decidido_en=resultado_actualizado_en WHERE operacion='PRESENTAR'",
                            "UPDATE gestion.operaciones_idempotentes_solicitud SET operacion='OTRA'"))
                assertThatThrownBy(() -> sql.execute(sentencia))
                        .isInstanceOf(SQLException.class)
                        .satisfies(
                                e ->
                                        assertThat(((SQLException) e).getSQLState())
                                                .isEqualTo("23514"));
        }
        assertThat(
                        administrador.queryForObject(
                                "SELECT count(*) FROM gestion.operaciones_idempotentes_solicitud WHERE expira_en IS NOT NULL",
                                Integer.class))
                .isZero();
    }

    @Test
    void eventosTecnicosSinComentarioMotivoNiClaveReutilizable() throws Exception {
        var a = presentada("SOLICITANTE", "SUPERVISOR");
        UUID clave = UUID.randomUUID();
        String comentario = "NO-LOG-COMENTARIO-005";
        decidir(a, "SUPERVISOR", "aprobar", comentario, clave, a.version());
        decidir(a, "SUPERVISOR", "aprobar", comentario, clave, a.version());
        var b = presentada("SOLICITANTE", "SUPERVISOR");
        decidir(b, "SUPERVISOR", "rechazar", "NO-LOG-MOTIVO-005", UUID.randomUUID(), b.version());
        String logs =
                String.join(
                        "\n",
                        eventos.list.stream().map(ILoggingEvent::getFormattedMessage).toList());
        assertThat(logs)
                .contains(
                        "accion=APROBAR",
                        "accion=RECHAZAR",
                        "accion=DUPLICADO_IDEMPOTENTE",
                        "peticion=",
                        "clave_hash=")
                .doesNotContain(
                        comentario,
                        "NO-LOG-MOTIVO-005",
                        clave.toString(),
                        tokens.get("SUPERVISOR"));
    }

    @Test
    void openApiEntradasCerradasResultadoMinimoYEstados() throws Exception {
        var api = json.readTree(enviar("GET", "/v3/api-docs", null, null, false, null).body());
        var schemas = api.path("components").path("schemas");
        for (String nombre : List.of("EntradaAprobacionSolicitud", "EntradaRechazoSolicitud"))
            assertThat(schemas.path(nombre).path("additionalProperties").asBoolean(true)).isFalse();
        assertThat(schemas.path("EntradaAprobacionSolicitud").path("properties").propertyNames())
                .containsExactlyInAnyOrder("version", "comentario");
        assertThat(schemas.path("EntradaRechazoSolicitud").path("required"))
                .extracting(JsonNode::asString)
                .containsExactlyInAnyOrder("version", "motivo");
        assertThat(schemas.path("ResultadoDecision").path("properties").propertyNames())
                .containsExactlyInAnyOrder(
                        "id", "numero", "estado", "version", "actualizadoEn", "decididoEn");
        assertThat(schemas.path("ResultadoPresentacion").path("properties").propertyNames())
                .containsExactlyInAnyOrder(
                        "id",
                        "numero",
                        "estado",
                        "version",
                        "actualizadoEn",
                        "presentadoEn",
                        "moneda",
                        "importeTotal");
        for (String ruta :
                List.of("/api/solicitudes/{id}/aprobar", "/api/solicitudes/{id}/rechazar")) {
            var operacion = api.path("paths").path(ruta).path("post");
            assertThat(operacion.path("security").size()).isPositive();
            assertThat(operacion.path("parameters"))
                    .anyMatch(
                            p ->
                                    p.path("name").asString().equals("Idempotency-Key")
                                            && p.path("required").asBoolean());
        }
        for (var caso :
                List.of(
                        List.of("/api/solicitudes", "post", "201", "DetalleSolicitud"),
                        List.of("/api/solicitudes", "get", "200", "PaginaResumenSolicitud"),
                        List.of("/api/solicitudes/{id}", "get", "200", "DetalleSolicitud"),
                        List.of("/api/solicitudes/{id}", "put", "200", "DetalleSolicitud"),
                        List.of(
                                "/api/solicitudes/{id}/presentar",
                                "post",
                                "200",
                                "ResultadoPresentacion"),
                        List.of(
                                "/api/solicitudes/{id}/aprobar",
                                "post",
                                "200",
                                "ResultadoDecision"),
                        List.of(
                                "/api/solicitudes/{id}/rechazar",
                                "post",
                                "200",
                                "ResultadoDecision"))) {
            var respuestas =
                    api.path("paths").path(caso.get(0)).path(caso.get(1)).path("responses");
            assertThat(respuestas.propertyNames())
                    .as("Respuestas de %s %s", caso.get(1), caso.get(0))
                    .contains(caso.get(2), "400", "401", "403", "404", "409", "500", "503");
            for (String estado :
                    List.of(caso.get(2), "400", "401", "403", "404", "409", "500", "503")) {
                var contenidos = respuestas.path(estado).path("content");
                assertThat(contenidos.size()).isPositive();
                for (var contenido : contenidos) {
                    assertThat(contenido.path("schema").path("$ref").asString())
                            .as("Esquema de %s %s respuesta %s", caso.get(1), caso.get(0), estado)
                            .isEqualTo(
                                    "#/components/schemas/"
                                            + (estado.equals(caso.get(2))
                                                    ? caso.get(3)
                                                    : "ErrorPublico"));
                }
            }
        }
        assertThat(
                        schemas.path("PaginaResumenSolicitud")
                                .path("properties")
                                .path("elementos")
                                .path("items")
                                .path("$ref")
                                .asString())
                .isEqualTo("#/components/schemas/ResumenSolicitud");
        assertThat(schemas.path("ErrorPublico").path("properties").propertyNames())
                .containsExactly("error");
    }

    private Connection conexionAdmin() throws SQLException {
        return DriverManager.getConnection(
                base.getJdbcUrl(), base.getUsername(), base.getPassword());
    }

    private Connection bloquear(String sql, UUID id) throws SQLException {
        Connection conexion = conexionAdmin();
        conexion.setAutoCommit(false);
        try (var sentencia = conexion.prepareStatement(sql)) {
            sentencia.setObject(1, id);
            sentencia.executeQuery().close();
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
                .as("conexiones realmente bloqueadas antes de liberar carrera005")
                .isEqualTo(cantidad);
    }

    private void esperarConsultaBloqueada(String patron) throws InterruptedException {
        long limite = System.nanoTime() + TimeUnit.SECONDS.toNanos(8);
        int esperando = 0;
        while (System.nanoTime() < limite && esperando < 1) {
            esperando =
                    administrador.queryForObject(
                            "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE ?",
                            Integer.class,
                            patron);
            if (esperando < 1) Thread.sleep(20);
        }
        assertThat(esperando).isEqualTo(1);
    }

    private Solicitud borrador(String autor, String supervisor) {
        var actor = actores.get(autor);
        var s = servicio.crear(actor, "Solicitud de aprobación", UUID.randomUUID());
        var admin = actores.get("ADMINISTRADOR");
        UUID proveedor =
                contexto.getBean(ServicioProveedores.class)
                        .crear(
                                new ActorProveedor(admin.id(), admin.roles()),
                                new DatosProveedor(
                                        TipoProveedor.PROFESIONAL,
                                        "Proveedor ficticio005",
                                        "ES",
                                        "FIC-" + UUID.randomUUID(),
                                        null,
                                        null))
                        .id();
        var concepto =
                new Concepto(
                        UUID.randomUUID(),
                        "Concepto ficticio005",
                        new BigDecimal("3.000"),
                        Concepto.Unidad.HORA,
                        new BigDecimal("0.3350"),
                        null,
                        1);
        return servicio.guardar(
                actor,
                s.id(),
                0,
                new DatosBorrador(
                        s.asunto(),
                        null,
                        proveedor,
                        actores.get(supervisor).id(),
                        List.of(concepto),
                        Set.of()),
                UUID.randomUUID());
    }

    private Solicitud presentada(String autor, String supervisor) {
        var s = borrador(autor, supervisor);
        servicio.presentar(
                actores.get(autor), s.id(), s.version(), UUID.randomUUID(), UUID.randomUUID());
        return servicio.consultar(actores.get(autor), s.id());
    }

    private HttpResponse<String> decidir(
            Solicitud s, String actor, String operacion, String texto, UUID clave, long version)
            throws Exception {
        var cuerpo = json.createObjectNode().put("version", version);
        String campo = operacion.equals("aprobar") ? "comentario" : "motivo";
        if (texto == null) cuerpo.putNull(campo);
        else cuerpo.put(campo, texto);
        return enviar(
                "POST",
                "/api/solicitudes/" + s.id() + "/" + operacion,
                cuerpo.toString(),
                actor,
                true,
                clave.toString());
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

    private static void error(HttpResponse<String> r, int estado, String codigo) {
        assertThat(r.statusCode()).as("HTTP %s; respuesta %s", estado, r.body()).isEqualTo(estado);
        assertThat(r.body()).isEqualTo("{\"error\":\"" + codigo + "\"}");
        assertThat(r.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
    }
}
