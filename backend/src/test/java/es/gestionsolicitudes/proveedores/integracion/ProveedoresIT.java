package es.gestionsolicitudes.proveedores.integracion;

import static org.assertj.core.api.Assertions.*;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import es.gestionsolicitudes.GestionSolicitudesApplication;
import es.gestionsolicitudes.identidad.aplicacion.*;
import es.gestionsolicitudes.identidad.dominio.Rol;
import es.gestionsolicitudes.proveedores.aplicacion.*;
import es.gestionsolicitudes.proveedores.dominio.*;
import java.net.URI;
import java.net.URLEncoder;
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
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ProveedoresIT {
    private static final String IMAGEN =
            "postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826";
    private static final Instant AHORA = Instant.parse("2026-10-14T00:00:00.123456789Z");
    private static final String CLAVE = "clave ficticia proveedores integración";
    private final JsonMapper json = JsonMapper.builder().build();
    private final Map<String, String> tokens = new HashMap<>();
    private PostgreSQLContainer base;
    private ConfigurableApplicationContext contexto;
    private JdbcTemplate administrador;
    private HttpClient cliente;
    private ServicioProveedores servicio;
    private ActorProveedor actorAdmin;
    private String origen;
    private String csrf;
    private ListAppender<ILoggingEvent> eventos;
    private Logger logger;

    @TestConfiguration(proxyBeanMethods = false)
    static class Componentes {
        @Bean
        @Primary
        Clock relojProveedor() {
            return Clock.fixed(AHORA, ZoneOffset.UTC);
        }
    }

    @BeforeAll
    void arrancar() throws Exception {
        base =
                new PostgreSQLContainer(
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
        // Escenario de actualización: una base V1/V2 existente recibe solo V3 al arrancar.
        var anterior =
                Flyway.configure()
                        .dataSource(
                                base.getJdbcUrl(), "gestion_migracion", "migracion-ficticia-prueba")
                        .defaultSchema("gestion")
                        .schemas("gestion")
                        .createSchemas(false)
                        .target("2")
                        .load();
        assertThat(anterior.migrate().migrationsExecuted).isEqualTo(2);
        UUID usuarioAnterior = UUID.randomUUID();
        administrador.update(
                "INSERT INTO gestion.usuarios(id,correo,nombre_visible,clave_hash,creado_en,actualizado_en) VALUES (?,?,?,?,?,?)",
                usuarioAnterior,
                "previo@ejemplo.invalid",
                "Usuario anterior ficticio",
                "$argon2id$ficticio",
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
        assertThat(contexto.getBean(Flyway.class).info().applied()).hasSize(3);
        assertThat(
                        administrador.queryForObject(
                                "SELECT count(*) FROM gestion.usuarios WHERE id=?",
                                Integer.class,
                                usuarioAnterior))
                .isEqualTo(1);
        assertThat(contexto.getBean(Flyway.class).migrate().migrationsExecuted).isZero();
        origen =
                "http://127.0.0.1:"
                        + contexto.getEnvironment().getRequiredProperty("local.server.port");
        cliente = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        servicio = contexto.getBean(ServicioProveedores.class);
        String hash = contexto.getBean(Contrasenas.class).codificar(CLAVE);
        for (Rol rol : Rol.values()) crearUsuario(rol.name(), Set.of(rol), hash);
        crearUsuario("UNION_AUDITOR", Set.of(Rol.SOLICITANTE, Rol.AUDITOR), hash);
        crearUsuario("UNION_ADMIN", Set.of(Rol.AUDITOR, Rol.ADMINISTRADOR), hash);
        csrf =
                enviar("GET", "/api/autenticacion/csrf", null, null, false)
                        .headers()
                        .allValues("Set-Cookie")
                        .stream()
                        .filter(c -> c.startsWith("XSRF-TOKEN="))
                        .findFirst()
                        .orElseThrow()
                        .split(";", 2)[0]
                        .substring(11);
        logger = (Logger) LoggerFactory.getLogger(ServicioProveedores.class);
        eventos = new ListAppender<>();
        eventos.start();
        logger.addAppender(eventos);
    }

    private void crearUsuario(String nombre, Set<Rol> roles, String hash) {
        UUID id = UUID.randomUUID();
        String correo = nombre.toLowerCase(Locale.ROOT) + "@ejemplo.invalid";
        new TransactionTemplate(contexto.getBean(PlatformTransactionManager.class))
                .executeWithoutResult(
                        estado ->
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
        if (nombre.equals("ADMINISTRADOR")) actorAdmin = new ActorProveedor(id, roles);
    }

    @BeforeEach
    void limpiar() {
        administrador.execute("TRUNCATE gestion.proveedores");
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
    void altaConsultaDTOFechasUnicodeYCamposPropios() throws Exception {
        var respuesta =
                enviar(
                        "POST",
                        "/api/proveedores",
                        cuerpo("  Acme  Ficticia  ", "ES", " ａｂ\u0085 １２３ "),
                        "ADMINISTRADOR",
                        true);
        assertThat(respuesta.statusCode()).isEqualTo(201);
        noCache(respuesta);
        JsonNode creado = json.readTree(respuesta.body());
        UUID id = UUID.fromString(creado.path("id").asString());
        assertThat(respuesta.headers().firstValue("Location")).hasValue("/api/proveedores/" + id);
        assertThat(creado.propertyNames())
                .containsExactlyInAnyOrder(
                        "id",
                        "tipo",
                        "denominacion",
                        "paisFiscal",
                        "identificadorFiscal",
                        "correoContacto",
                        "telefonoContacto",
                        "activo",
                        "version",
                        "creadoEn",
                        "actualizadoEn");
        assertThat(creado.path("denominacion").asString()).isEqualTo("Acme  Ficticia");
        assertThat(creado.path("activo").asBoolean()).isTrue();
        assertThat(creado.path("version").asLong()).isZero();
        assertThat(creado.path("correoContacto").isNull()).isTrue();
        assertThat(creado.path("creadoEn").asString()).isEqualTo("2026-10-14T00:00:00.123456Z");
        assertThat(
                        json.readTree(
                                enviar("GET", "/api/proveedores/" + id, null, "SOLICITANTE", false)
                                        .body()))
                .isEqualTo(creado);
        assertThat(
                        administrador.queryForObject(
                                "SELECT identificador_fiscal_normalizado FROM gestion.proveedores WHERE id=?",
                                String.class,
                                id))
                .isEqualTo("AB 123");
        var modificado =
                enviar(
                        "PUT",
                        "/api/proveedores/" + id,
                        conVersion(cuerpo("Editado", "ES", "AB 123"), 0),
                        "ADMINISTRADOR",
                        true);
        assertThat(modificado.statusCode()).isEqualTo(200);
        JsonNode actualizado = json.readTree(modificado.body());
        assertThat(actualizado.path("creadoEn")).isEqualTo(creado.path("creadoEn"));
        assertThat(actualizado.path("actualizadoEn").asString())
                .isEqualTo("2026-10-14T00:00:00.123457Z");
        assertThat(actualizado.path("version").asLong()).isEqualTo(1);
        assertThat(actualizado.path("id")).isEqualTo(creado.path("id"));
        assertThat(actualizado.path("activo").asBoolean()).isTrue();
    }

    @Test
    void altaInvalidaNoPersisteYNuncaReflejaEntrada() throws Exception {
        String valido = cuerpo("Acme", "ES", "ABC123");
        for (String campo :
                List.of(
                        "id",
                        "activo",
                        "version",
                        "creadoEn",
                        "actualizadoEn",
                        "identificadorFiscalNormalizado",
                        "roles",
                        "campoInesperado")) {
            var mapa = json.readTree(valido).deepCopy();
            ((tools.jackson.databind.node.ObjectNode) mapa).put(campo, "dato-ficticio-no-reflejar");
            error(
                    enviar("POST", "/api/proveedores", mapa.toString(), "ADMINISTRADOR", true),
                    400,
                    "SOLICITUD_INVALIDA");
        }
        for (String invalido :
                List.of(
                        "null",
                        "[]",
                        "{}",
                        "{",
                        "{\"tipo\":123}",
                        valido.replace("ABC123", "AB"),
                        valido.replace("PERSONA_JURIDICA", "DESCONOCIDO"),
                        valido.replace("\"ES\"", "\"ZZ\""),
                        valido.replace("Acme", " "),
                        valido.replace("ABC123", "ß".repeat(33))))
            error(
                    enviar("POST", "/api/proveedores", invalido, "ADMINISTRADOR", true),
                    400,
                    "SOLICITUD_INVALIDA");
        assertThat(cantidad()).isZero();
    }

    @Test
    void matrizHttpCompletaConUnionDenegacionCsrfY404() throws Exception {
        Proveedor p = alta("Visible", "ES", "ROL-123");
        String ruta = "/api/proveedores/" + p.id();
        error(enviar("GET", "/api/proveedores", null, null, false), 401, "NO_AUTENTICADO");
        error(
                enviar(
                        "POST",
                        "/api/proveedores",
                        cuerpo("Sin sesión", "ES", "ROL-999"),
                        null,
                        true),
                401,
                "NO_AUTENTICADO");
        for (String rol :
                List.of(
                        "SOLICITANTE",
                        "SUPERVISOR",
                        "AUDITOR",
                        "ADMINISTRADOR",
                        "UNION_AUDITOR",
                        "UNION_ADMIN")) {
            assertThat(enviar("GET", ruta, null, rol, false).statusCode()).isEqualTo(200);
            assertThat(enviar("GET", "/api/proveedores", null, rol, false).statusCode())
                    .isEqualTo(200);
            if (!rol.equals("ADMINISTRADOR") && !rol.equals("UNION_ADMIN")) {
                error(
                        enviar(
                                "POST",
                                "/api/proveedores",
                                cuerpo("Sin permiso", "ES", "ROL-888"),
                                rol,
                                true),
                        403,
                        "ACCESO_NO_PERMITIDO");
                error(
                        enviar(
                                "PUT",
                                ruta,
                                conVersion(cuerpo("Sin permiso", "ES", "ROL-123"), 0),
                                rol,
                                true),
                        403,
                        "ACCESO_NO_PERMITIDO");
                error(
                        enviar("POST", ruta + "/desactivar", "{\"version\":0}", rol, true),
                        403,
                        "ACCESO_NO_PERMITIDO");
                error(
                        enviar("POST", ruta + "/reactivar", "{\"version\":0}", rol, true),
                        403,
                        "ACCESO_NO_PERMITIDO");
            }
        }
        for (String[] accion :
                List.of(
                        new String[] {
                            "POST", "/api/proveedores", cuerpo("Sin CSRF", "ES", "ROL-887")
                        },
                        new String[] {
                            "PUT", ruta, conVersion(cuerpo("Sin CSRF", "ES", "ROL-123"), 0)
                        },
                        new String[] {"POST", ruta + "/desactivar", "{\"version\":0}"},
                        new String[] {"POST", ruta + "/reactivar", "{\"version\":0}"}))
            error(
                    enviar(accion[0], accion[1], accion[2], "ADMINISTRADOR", false),
                    403,
                    "ACCESO_NO_PERMITIDO");
        error(enviar("DELETE", ruta, null, "ADMINISTRADOR", true), 403, "ACCESO_NO_PERMITIDO");
        error(
                enviar("GET", "/api/ruta-no-autorizada", null, "ADMINISTRADOR", false),
                403,
                "ACCESO_NO_PERMITIDO");
        error(
                enviar(
                        "GET",
                        "/api/proveedores/" + UUID.randomUUID(),
                        null,
                        "ADMINISTRADOR",
                        false),
                404,
                "PROVEEDOR_NO_ENCONTRADO");
        error(
                enviar("GET", "/api/proveedores/no-es-uuid", null, "ADMINISTRADOR", false),
                400,
                "SOLICITUD_INVALIDA");
        assertThat(cantidad()).isEqualTo(1);
    }

    @Test
    void bajaReactivacionRepeticionesVisibilidadYVersionObsoleta() throws Exception {
        Proveedor p = alta("Baja ficticia", "ES", "BAJA-123");
        String ruta = "/api/proveedores/" + p.id();
        var baja = enviar("POST", ruta + "/desactivar", "{\"version\":0}", "ADMINISTRADOR", true);
        assertThat(baja.statusCode()).isEqualTo(200);
        assertThat(json.readTree(baja.body()).path("activo").asBoolean()).isFalse();
        assertThat(
                        enviar(
                                        "POST",
                                        ruta + "/desactivar",
                                        "{\"version\":1}",
                                        "ADMINISTRADOR",
                                        true)
                                .body())
                .isEqualTo(baja.body());
        error(
                enviar("POST", ruta + "/desactivar", "{\"version\":0}", "ADMINISTRADOR", true),
                409,
                "VERSION_OBSOLETA");
        for (String rol : List.of("SOLICITANTE", "SUPERVISOR")) {
            error(enviar("GET", ruta, null, rol, false), 404, "PROVEEDOR_NO_ENCONTRADO");
            assertThat(pagina("", rol).path("totalElementos").asLong()).isZero();
            error(
                    enviar("GET", "/api/proveedores?activo=false", null, rol, false),
                    403,
                    "ACCESO_NO_PERMITIDO");
            error(
                    enviar("GET", "/api/proveedores?activo=todos", null, rol, false),
                    403,
                    "ACCESO_NO_PERMITIDO");
        }
        for (String rol : List.of("AUDITOR", "ADMINISTRADOR", "UNION_AUDITOR", "UNION_ADMIN")) {
            assertThat(enviar("GET", ruta, null, rol, false).statusCode()).isEqualTo(200);
            assertThat(pagina("?activo=false", rol).path("totalElementos").asLong()).isEqualTo(1);
        }
        var editada =
                enviar(
                        "PUT",
                        ruta,
                        conVersion(cuerpo("Editada inactiva", "ES", "BAJA-123"), 1),
                        "ADMINISTRADOR",
                        true);
        assertThat(editada.statusCode()).isEqualTo(200);
        assertThat(json.readTree(editada.body()).path("activo").asBoolean()).isFalse();
        var activa = enviar("POST", ruta + "/reactivar", "{\"version\":2}", "UNION_ADMIN", true);
        assertThat(activa.statusCode()).isEqualTo(200);
        assertThat(json.readTree(activa.body()).path("activo").asBoolean()).isTrue();
        assertThat(
                        enviar(
                                        "POST",
                                        ruta + "/reactivar",
                                        "{\"version\":3}",
                                        "ADMINISTRADOR",
                                        true)
                                .body())
                .isEqualTo(activa.body());
        error(
                enviar("POST", ruta + "/reactivar", "{\"version\":2}", "ADMINISTRADOR", true),
                409,
                "VERSION_OBSOLETA");
        assertThat(enviar("GET", ruta, null, "SUPERVISOR", false).statusCode()).isEqualTo(200);
        assertThat(cantidad()).isEqualTo(1);
        assertThat(
                        eventos.list.stream()
                                .filter(
                                        e ->
                                                e.getFormattedMessage()
                                                                .contains("accion=DESACTIVAR")
                                                        && e.getFormattedMessage()
                                                                .endsWith("resultado=CORRECTO"))
                                .count())
                .isEqualTo(1);
        assertThat(
                        eventos.list.stream()
                                .filter(
                                        e ->
                                                e.getFormattedMessage().contains("accion=REACTIVAR")
                                                        && e.getFormattedMessage()
                                                                .endsWith("resultado=CORRECTO"))
                                .count())
                .isEqualTo(1);
    }

    @Test
    void duplicadosIncluyenInactivosNormalizacionYConservanPaisYPuntuacion() throws Exception {
        Proveedor p = alta("Coincidente", "ES", "AB\u0085 123");
        servicio.cambiarEstado(actorAdmin, p.id(), 0, false);
        error(
                enviar(
                        "POST",
                        "/api/proveedores",
                        cuerpo("Coincidente", "ES", " ａｂ  １２３ "),
                        "ADMINISTRADOR",
                        true),
                409,
                "PROVEEDOR_DUPLICADO");
        assertThat(
                        enviar(
                                        "POST",
                                        "/api/proveedores",
                                        cuerpo("Coincidente", "FR", "AB 123"),
                                        "ADMINISTRADOR",
                                        true)
                                .statusCode())
                .isEqualTo(201);
        assertThat(
                        enviar(
                                        "POST",
                                        "/api/proveedores",
                                        cuerpo("Coincidente", "ES", "AB-123"),
                                        "ADMINISTRADOR",
                                        true)
                                .statusCode())
                .isEqualTo(201);
        assertThat(cantidad()).isEqualTo(3);
    }

    @Test
    void busquedaLiteralAcentosAndPaginacionOrdenYFueraDeRango() throws Exception {
        var primero = alta("Árbol %_! Ficticio", "ES", "BUS-001");
        var segundo = alta("Árbol %_! Ficticio", "ES", "BUS-002");
        alta("Arbol otro", "FR", "BUS-003");
        servicio.crear(
                actorAdmin,
                new DatosProveedor(
                        TipoProveedor.PROFESIONAL, "Árbol distinto", "ES", "BUS-004", null, null));
        assertThat(
                        pagina("?denominacion=" + url("árBOL %_!"), "SOLICITANTE")
                                .path("totalElementos")
                                .asLong())
                .isEqualTo(2);
        assertThat(pagina("?denominacion=arbol", "SOLICITANTE").path("totalElementos").asLong())
                .isEqualTo(1);
        assertThat(
                        pagina("?denominacion=" + url("' OR 1=1 --"), "SOLICITANTE")
                                .path("totalElementos")
                                .asLong())
                .isZero();
        assertThat(
                        pagina(
                                        "?denominacion="
                                                + url("Árbol")
                                                + "&paisFiscal=ES&tipo=PERSONA_JURIDICA&identificadorFiscal="
                                                + url(" ｂｕｓ-００１ "),
                                        "SOLICITANTE")
                                .path("totalElementos")
                                .asLong())
                .isEqualTo(1);
        var ordenados = new ArrayList<>(List.of(primero.id().toString(), segundo.id().toString()));
        Collections.sort(ordenados);
        var pagina1 =
                pagina(
                        "?denominacion=" + url("%_!") + "&size=1&page=0&sort=denominacion,desc",
                        "AUDITOR");
        var pagina2 =
                pagina(
                        "?denominacion=" + url("%_!") + "&size=1&page=1&sort=denominacion,desc",
                        "AUDITOR");
        assertThat(pagina1.path("elementos").get(0).path("id").asString())
                .isEqualTo(ordenados.get(0));
        assertThat(pagina2.path("elementos").get(0).path("id").asString())
                .isEqualTo(ordenados.get(1));
        assertThat(pagina1.path("totalPaginas").asLong()).isEqualTo(2);
        var fuera = pagina("?page=999&size=1", "ADMINISTRADOR");
        assertThat(fuera.path("elementos").size()).isZero();
        assertThat(fuera.path("totalElementos").asLong()).isEqualTo(4);
        for (String orden :
                List.of("creadoEn,asc", "creadoEn,desc", "actualizadoEn,asc", "actualizadoEn,desc"))
            assertThat(pagina("?sort=" + orden, "ADMINISTRADOR").path("totalElementos").asLong())
                    .isEqualTo(4);
    }

    @Test
    void filtrosInvalidosYCamposEscrituraProtegidos() throws Exception {
        Proveedor p = alta("Valida", "ES", "VAL-123");
        String ruta = "/api/proveedores/" + p.id();
        for (String consulta :
                List.of(
                        "page=-1",
                        "size=0",
                        "size=101",
                        "page=1.0",
                        "page=2147483648",
                        "size=abc",
                        "sort=id,asc",
                        "sort=denominacion,invalid",
                        "sort=denominacion",
                        "sort=" + url("denominacion;drop table,asc"),
                        "activo=FALSE",
                        "tipo=OTRO",
                        "paisFiscal=es",
                        "denominacion=" + "x".repeat(129),
                        "identificadorFiscal=AB",
                        "page=0&page=1",
                        "version=0"))
            error(
                    enviar("GET", "/api/proveedores?" + consulta, null, "ADMINISTRADOR", false),
                    400,
                    "SOLICITUD_INVALIDA");
        for (String version :
                List.of("-1", "1.0", "\"0\"", "null", "true", "9223372036854775808")) {
            error(
                    enviar(
                            "POST",
                            ruta + "/desactivar",
                            "{\"version\":" + version + "}",
                            "ADMINISTRADOR",
                            true),
                    400,
                    "SOLICITUD_INVALIDA");
            error(
                    enviar(
                            "PUT",
                            ruta,
                            conVersion(cuerpo("Valida", "ES", "VAL-123"), 0)
                                    .replace("\"version\":0", "\"version\":" + version),
                            "ADMINISTRADOR",
                            true),
                    400,
                    "SOLICITUD_INVALIDA");
        }
        for (String campo :
                List.of(
                        "activo",
                        "id",
                        "creadoEn",
                        "actualizadoEn",
                        "identificadorFiscalNormalizado",
                        "roles")) {
            String entrada = conVersion(cuerpo("Valida", "ES", "VAL-123"), 0);
            entrada = entrada.substring(0, entrada.length() - 1) + ",\"" + campo + "\":true}";
            error(enviar("PUT", ruta, entrada, "ADMINISTRADOR", true), 400, "SOLICITUD_INVALIDA");
        }
        error(
                enviar(
                        "POST",
                        ruta + "/desactivar",
                        "{\"version\":0,\"activo\":false}",
                        "ADMINISTRADOR",
                        true),
                400,
                "SOLICITUD_INVALIDA");
        error(
                enviar("PUT", ruta, cuerpo("Valida", "ES", "VAL-123"), "ADMINISTRADOR", true),
                400,
                "SOLICITUD_INVALIDA");
        assertThat(servicio.consultar(actorAdmin, p.id()).version()).isZero();
    }

    @Test
    void actualizacionDuplicadaRollbackYVersionObsoletaNoSobrescriben() throws Exception {
        var primero = alta("Primero", "ES", "UPD-001");
        var segundo = alta("Segundo", "ES", "UPD-002");
        String ruta = "/api/proveedores/" + segundo.id();
        error(
                enviar(
                        "PUT",
                        ruta,
                        conVersion(cuerpo("Intento duplicado", "ES", "UPD-001"), 0),
                        "ADMINISTRADOR",
                        true),
                409,
                "PROVEEDOR_DUPLICADO");
        assertThat(servicio.consultar(actorAdmin, segundo.id())).isEqualTo(segundo);
        var actualizado =
                enviar(
                        "PUT",
                        ruta,
                        conVersion(cuerpo("Cambio ganador", "ES", "UPD-002"), 0),
                        "ADMINISTRADOR",
                        true);
        assertThat(actualizado.statusCode()).isEqualTo(200);
        error(
                enviar(
                        "PUT",
                        ruta,
                        conVersion(cuerpo("No sobrescribir", "ES", "UPD-002"), 0),
                        "ADMINISTRADOR",
                        true),
                409,
                "VERSION_OBSOLETA");
        assertThat(servicio.consultar(actorAdmin, segundo.id()).datos().denominacion())
                .isEqualTo("Cambio ganador");
        assertThat(servicio.consultar(actorAdmin, primero.id())).isEqualTo(primero);
        for (String operacion : List.of("/desactivar", "/reactivar"))
            error(
                    enviar(
                            "POST",
                            "/api/proveedores/" + UUID.randomUUID() + operacion,
                            "{\"version\":0}",
                            "ADMINISTRADOR",
                            true),
                    404,
                    "PROVEEDOR_NO_ENCONTRADO");
        error(
                enviar(
                        "PUT",
                        "/api/proveedores/" + UUID.randomUUID(),
                        conVersion(cuerpo("Ausente", "ES", "UPD-003"), 0),
                        "ADMINISTRADOR",
                        true),
                404,
                "PROVEEDOR_NO_ENCONTRADO");
    }

    @Test
    void dosAltasSimultaneasEsperanConexionRealYUnicaPersiste() throws Exception {
        try (Connection bloqueo = conexionAdmin();
                var hilos = Executors.newFixedThreadPool(2)) {
            bloqueo.setAutoCommit(false);
            bloqueo.createStatement().execute("LOCK TABLE gestion.proveedores IN SHARE MODE");
            var inicio = new CountDownLatch(1);
            Callable<String> alta =
                    () -> {
                        inicio.await();
                        try {
                            alta("Alta simultánea", "ES", "CARRERA-ALTA");
                            return "CORRECTO";
                        } catch (ErrorProveedor e) {
                            return e.codigo().name();
                        }
                    };
            var uno = hilos.submit(alta);
            var dos = hilos.submit(alta);
            inicio.countDown();
            try {
                esperarBloqueos("INSERT INTO gestion.proveedores");
            } finally {
                bloqueo.commit();
            }
            assertThat(List.of(uno.get(10, TimeUnit.SECONDS), dos.get(10, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder("CORRECTO", "PROVEEDOR_DUPLICADO");
            assertThat(cantidad()).isEqualTo(1);
        }
    }

    @Test
    void dosEdicionesSimultaneasMismaVersionSoloUnaGana() throws Exception {
        Proveedor p = alta("Original", "ES", "CARRERA-EDIT");
        try (Connection bloqueo = bloquear(p.id());
                var hilos = Executors.newFixedThreadPool(2)) {
            var inicio = new CountDownLatch(1);
            Callable<String> editar =
                    () -> {
                        inicio.await();
                        try {
                            servicio.modificar(
                                    actorAdmin,
                                    p.id(),
                                    0,
                                    datos("Cambio concurrente", "ES", "CARRERA-EDIT"));
                            return "CORRECTO";
                        } catch (ErrorProveedor e) {
                            return e.codigo().name();
                        }
                    };
            var uno = hilos.submit(editar);
            var dos = hilos.submit(editar);
            inicio.countDown();
            try {
                esperarBloqueos("UPDATE gestion.proveedores");
            } finally {
                bloqueo.commit();
            }
            assertThat(List.of(uno.get(10, TimeUnit.SECONDS), dos.get(10, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder("CORRECTO", "VERSION_OBSOLETA");
            assertThat(servicio.consultar(actorAdmin, p.id()).version()).isEqualTo(1);
        }
    }

    @Test
    void estadosConcurrentesVersionAnteriorNoSeConviertenEnNoOpExitoso() throws Exception {
        Proveedor p = alta("Estado concurrente", "ES", "CARRERA-EST");
        try (Connection bloqueo = bloquear(p.id());
                var hilos = Executors.newFixedThreadPool(2)) {
            var inicio = new CountDownLatch(1);
            Callable<String> bajar =
                    () -> {
                        inicio.await();
                        try {
                            servicio.cambiarEstado(actorAdmin, p.id(), 0, false);
                            return "CORRECTO";
                        } catch (ErrorProveedor e) {
                            return e.codigo().name();
                        }
                    };
            var uno = hilos.submit(bajar);
            var dos = hilos.submit(bajar);
            inicio.countDown();
            try {
                esperarBloqueos("SELECT %FROM gestion.proveedores%FOR UPDATE");
            } finally {
                bloqueo.commit();
            }
            assertThat(List.of(uno.get(10, TimeUnit.SECONDS), dos.get(10, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder("CORRECTO", "VERSION_OBSOLETA");
            assertThat(servicio.consultar(actorAdmin, p.id()).version()).isEqualTo(1);
        }
    }

    @Test
    void eventosSoloTrasCommitSeisResultadosSinDatosYRollbackReal() {
        var tx = new TransactionTemplate(contexto.getBean(PlatformTransactionManager.class));
        tx.executeWithoutResult(
                estado -> {
                    servicio.crear(
                            actorAdmin, datos("Nombre sensible ficticio", "ES", "NO-LOG-FISCAL"));
                    assertThat(eventos.list).isEmpty();
                    estado.setRollbackOnly();
                });
        assertThat(cantidad()).isZero();
        assertThat(eventos.list).isEmpty();
        var datos =
                new DatosProveedor(
                        TipoProveedor.PROFESIONAL,
                        "Nombre sensible ficticio",
                        "ES",
                        "NO-LOG-FISCAL",
                        "no-log-contacto@ejemplo.invalid",
                        "NO-LOG-TELEFONO");
        Proveedor p = servicio.crear(actorAdmin, datos);
        servicio.modificar(actorAdmin, p.id(), 0, datos);
        servicio.cambiarEstado(actorAdmin, p.id(), 1, false);
        servicio.cambiarEstado(actorAdmin, p.id(), 2, true);
        assertThatThrownBy(() -> servicio.crear(actorAdmin, datos))
                .hasMessage("PROVEEDOR_DUPLICADO");
        assertThatThrownBy(() -> servicio.modificar(actorAdmin, p.id(), 0, datos))
                .hasMessage("VERSION_OBSOLETA");
        assertThat(eventos.list).hasSize(6);
        for (ILoggingEvent evento : eventos.list) {
            assertThat(evento.getFormattedMessage())
                    .matches(
                            "accion=(CREAR|MODIFICAR|DESACTIVAR|REACTIVAR) usuario=[0-9a-f-]{36} proveedor=[0-9a-f-]{36} resultado=(CORRECTO|PROVEEDOR_DUPLICADO|VERSION_OBSOLETA)");
            assertThat(evento.getThrowableProxy()).isNull();
        }
        String logs = base.getLogs();
        assertThat(
                        logs.contains("NO-LOG-FISCAL")
                                || logs.contains("no-log-contacto")
                                || logs.contains("NO-LOG-TELEFONO")
                                || logs.contains("Nombre sensible ficticio"))
                .isFalse();
    }

    @Test
    void restriccionesYRolPostgresSinDeleteDdlNiBypassUnique() throws Exception {
        Proveedor p = alta("Integridad", "ES", "DB-123");
        try (Connection conexion =
                        DriverManager.getConnection(
                                base.getJdbcUrl(), "gestion_app", "aplicacion-ficticia-prueba");
                Statement sentencia = conexion.createStatement()) {
            assertThat(sentencia.executeQuery("SELECT count(*) FROM gestion.proveedores").next())
                    .isTrue();
            for (String sql :
                    List.of(
                            "DELETE FROM gestion.proveedores",
                            "TRUNCATE gestion.proveedores",
                            "ALTER TABLE gestion.proveedores ADD COLUMN no_permitida text",
                            "CREATE TABLE gestion.no_permitida(id int)"))
                assertThatThrownBy(() -> sentencia.execute(sql))
                        .isInstanceOf(SQLException.class)
                        .satisfies(
                                e ->
                                        assertThat(((SQLException) e).getSQLState())
                                                .isEqualTo("42501"));
            for (String sql :
                    List.of(
                            "UPDATE gestion.proveedores SET version=-1",
                            "UPDATE gestion.proveedores SET tipo='OTRO'",
                            "UPDATE gestion.proveedores SET pais_fiscal='es'",
                            "UPDATE gestion.proveedores SET denominacion=''",
                            "UPDATE gestion.proveedores SET identificador_fiscal_normalizado='AB'",
                            "UPDATE gestion.proveedores SET actualizado_en=creado_en-interval '1 second'"))
                assertThatThrownBy(() -> sentencia.execute(sql))
                        .isInstanceOf(SQLException.class)
                        .satisfies(
                                e ->
                                        assertThat(((SQLException) e).getSQLState())
                                                .isEqualTo("23514"));
        }
        assertThat(cantidad()).isEqualTo(1);
        assertThat(servicio.consultar(actorAdmin, p.id()).version()).isZero();
    }

    @Test
    void contratoOpenapiDocumentaDtosCerradosVersionYFiltros() throws Exception {
        var respuesta = enviar("GET", "/v3/api-docs", null, null, false);
        assertThat(respuesta.statusCode()).isEqualTo(200);
        JsonNode contrato = json.readTree(respuesta.body());
        assertThat(
                        contrato.path("paths")
                                .path("/api/proveedores")
                                .path("post")
                                .path("responses")
                                .has("201"))
                .isTrue();
        assertThat(contrato.path("paths").path("/api/proveedores/{id}").has("put")).isTrue();
        assertThat(contrato.path("paths").has("/api/proveedores/{id}/reactivar")).isTrue();
        assertThat(contrato.path("paths").has("/api/proveedores/{id}/desactivar")).isTrue();
        String esquema =
                contrato.path("components").path("schemas").path("ProveedorPublico").toString();
        assertThat(esquema).doesNotContain("identificadorFiscalNormalizado", "fiscalNormalizado");
        assertThat(
                        contrato.path("components")
                                .path("schemas")
                                .path("Edicion")
                                .path("properties")
                                .has("version"))
                .isTrue();
        assertThat(
                        contrato.path("components")
                                .path("schemas")
                                .path("Alta")
                                .has("additionalProperties"))
                .isTrue();
        for (var requerido :
                Map.of(
                                "Alta",
                                        Set.of(
                                                "tipo",
                                                "denominacion",
                                                "paisFiscal",
                                                "identificadorFiscal"),
                                "Edicion",
                                        Set.of(
                                                "tipo",
                                                "denominacion",
                                                "paisFiscal",
                                                "identificadorFiscal",
                                                "version"),
                                "Estado", Set.of("version"))
                        .entrySet()) {
            var declarados =
                    contrato.path("components")
                            .path("schemas")
                            .path(requerido.getKey())
                            .path("required");
            Set<String> nombres = new HashSet<>();
            for (int i = 0; i < declarados.size(); i++) nombres.add(declarados.get(i).asString());
            assertThat(nombres).isEqualTo(requerido.getValue());
        }
        assertThat(
                        contrato.path("components")
                                .path("schemas")
                                .path("Alta")
                                .path("additionalProperties")
                                .asBoolean())
                .isFalse();
        assertThat(
                        contrato.path("paths")
                                .path("/api/proveedores")
                                .path("get")
                                .path("parameters")
                                .size())
                .isEqualTo(8);
    }

    @Test
    void csrfSeReponeEnJarRealTrasCadaBearerParaEscriturasConsecutivas() throws Exception {
        Map<String, String> jar = new HashMap<>();
        jar.put("XSRF-TOKEN", csrf);
        var alta =
                navegar(
                        jar,
                        "POST",
                        "/api/proveedores",
                        cuerpo("Cookie real", "ES", "JAR-123"),
                        true);
        assertThat(alta.statusCode()).isEqualTo(201);
        assertThat(jar.containsKey("XSRF-TOKEN"))
                .as("Bearer repone cookie CSRF utilizable")
                .isTrue();
        String ruta = "/api/proveedores/" + json.readTree(alta.body()).path("id").asString();
        assertThat(navegar(jar, "GET", ruta, null, true).statusCode()).isEqualTo(200);
        assertThat(
                        navegar(
                                        jar,
                                        "PUT",
                                        ruta,
                                        conVersion(cuerpo("Cookie editada", "ES", "JAR-123"), 0),
                                        true)
                                .statusCode())
                .isEqualTo(200);
        assertThat(navegar(jar, "POST", ruta + "/desactivar", "{\"version\":1}", true).statusCode())
                .isEqualTo(200);
        assertThat(navegar(jar, "POST", ruta + "/reactivar", "{\"version\":2}", true).statusCode())
                .isEqualTo(200);
        error(
                navegar(
                        jar,
                        "PUT",
                        ruta,
                        conVersion(cuerpo("Cookie sin cabecera", "ES", "JAR-123"), 3),
                        false),
                403,
                "ACCESO_NO_PERMITIDO");
        assertThat(
                        servicio.consultar(
                                        actorAdmin,
                                        UUID.fromString(
                                                json.readTree(alta.body()).path("id").asString()))
                                .version())
                .isEqualTo(3);
    }

    private HttpResponse<String> navegar(
            Map<String, String> jar,
            String metodo,
            String ruta,
            String cuerpo,
            boolean cabeceraCsrf)
            throws Exception {
        var peticion =
                HttpRequest.newBuilder(URI.create(origen + ruta))
                        .timeout(Duration.ofSeconds(15))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + tokens.get("ADMINISTRADOR"))
                        .method(
                                metodo,
                                cuerpo == null
                                        ? HttpRequest.BodyPublishers.noBody()
                                        : HttpRequest.BodyPublishers.ofString(cuerpo));
        if (jar.containsKey("XSRF-TOKEN")) {
            peticion.header("Cookie", "XSRF-TOKEN=" + jar.get("XSRF-TOKEN"));
            if (cabeceraCsrf) peticion.header("X-XSRF-TOKEN", jar.get("XSRF-TOKEN"));
        }
        var respuesta = cliente.send(peticion.build(), HttpResponse.BodyHandlers.ofString());
        for (String cabecera : respuesta.headers().allValues("Set-Cookie")) {
            var cookie = java.net.HttpCookie.parse(cabecera).getFirst();
            if (cookie.getMaxAge() == 0 || cookie.getValue().isEmpty())
                jar.remove(cookie.getName());
            else jar.put(cookie.getName(), cookie.getValue());
        }
        return respuesta;
    }

    private Proveedor alta(String nombre, String pais, String fiscal) {
        return servicio.crear(actorAdmin, datos(nombre, pais, fiscal));
    }

    private static DatosProveedor datos(String nombre, String pais, String fiscal) {
        return new DatosProveedor(TipoProveedor.PERSONA_JURIDICA, nombre, pais, fiscal, null, null);
    }

    private long cantidad() {
        return administrador.queryForObject("SELECT count(*) FROM gestion.proveedores", Long.class);
    }

    private String cuerpo(String nombre, String pais, String fiscal) {
        return json.writeValueAsString(
                Map.of(
                        "tipo",
                        "PERSONA_JURIDICA",
                        "denominacion",
                        nombre,
                        "paisFiscal",
                        pais,
                        "identificadorFiscal",
                        fiscal));
    }

    private static String conVersion(String entrada, long version) {
        return entrada.substring(0, entrada.length() - 1) + ",\"version\":" + version + "}";
    }

    private static String url(String valor) {
        return URLEncoder.encode(valor, StandardCharsets.UTF_8);
    }

    private JsonNode pagina(String query, String rol) throws Exception {
        var respuesta = enviar("GET", "/api/proveedores" + query, null, rol, false);
        assertThat(respuesta.statusCode()).isEqualTo(200);
        return json.readTree(respuesta.body());
    }

    private HttpResponse<String> enviar(
            String metodo, String ruta, String cuerpo, String rol, boolean conCsrf)
            throws Exception {
        var peticion =
                HttpRequest.newBuilder(URI.create(origen + ruta))
                        .timeout(Duration.ofSeconds(15))
                        .header("Content-Type", "application/json")
                        .method(
                                metodo,
                                cuerpo == null
                                        ? HttpRequest.BodyPublishers.noBody()
                                        : HttpRequest.BodyPublishers.ofString(cuerpo));
        if (rol != null) peticion.header("Authorization", "Bearer " + tokens.get(rol));
        if (conCsrf) peticion.header("Cookie", "XSRF-TOKEN=" + csrf).header("X-XSRF-TOKEN", csrf);
        return cliente.send(peticion.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static void noCache(HttpResponse<String> respuesta) {
        assertThat(respuesta.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
        assertThat(respuesta.headers().firstValue("Pragma")).hasValue("no-cache");
    }

    private static void error(HttpResponse<String> respuesta, int estado, String codigo) {
        assertThat(respuesta.statusCode()).isEqualTo(estado);
        assertThat(respuesta.body().equals("{\"error\":\"" + codigo + "\"}"))
                .as("respuesta pública sin entrada ni detalles internos")
                .isTrue();
        noCache(respuesta);
    }

    private Connection conexionAdmin() throws SQLException {
        return DriverManager.getConnection(
                base.getJdbcUrl(), base.getUsername(), base.getPassword());
    }

    private Connection bloquear(UUID id) throws SQLException {
        Connection conexion = conexionAdmin();
        conexion.setAutoCommit(false);
        try (var sentencia =
                conexion.prepareStatement(
                        "SELECT id FROM gestion.proveedores WHERE id=? FOR UPDATE")) {
            sentencia.setObject(1, id);
            sentencia.executeQuery().close();
        }
        return conexion;
    }

    private void esperarBloqueos(String consulta) throws InterruptedException {
        long limite = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        int esperando = 0;
        while (System.nanoTime() < limite && esperando < 2) {
            esperando =
                    administrador.queryForObject(
                            "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND usename='gestion_app' AND wait_event_type='Lock' AND query LIKE ?",
                            Integer.class,
                            consulta + "%");
            if (esperando < 2) Thread.sleep(20);
        }
        assertThat(esperando)
                .as("dos conexiones PostgreSQL realmente bloqueadas antes de liberar la carrera")
                .isEqualTo(2);
    }
}
