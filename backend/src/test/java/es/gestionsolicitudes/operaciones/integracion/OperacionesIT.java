package es.gestionsolicitudes.operaciones.integracion;

import static org.assertj.core.api.Assertions.*;

import es.gestionsolicitudes.GestionSolicitudesApplication;
import es.gestionsolicitudes.identidad.aplicacion.*;
import es.gestionsolicitudes.identidad.dominio.Rol;
import es.gestionsolicitudes.operaciones.aplicacion.*;
import es.gestionsolicitudes.operaciones.dominio.*;
import es.gestionsolicitudes.proveedores.aplicacion.ServicioProveedores;
import es.gestionsolicitudes.proveedores.dominio.*;
import es.gestionsolicitudes.solicitudes.aplicacion.ServicioSolicitudes;
import es.gestionsolicitudes.solicitudes.dominio.*;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class OperacionesIT {
    private static final String IMAGEN =
            "postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826";
    private static final Instant AHORA = Instant.parse("2026-10-15T10:00:00.123456Z");
    private static final String CLAVE = "contraseña ficticia exclusiva pruebas006";
    private final JsonMapper json = JsonMapper.builder().build();
    private final Map<String, UUID> usuarios = new HashMap<>();
    private final Map<String, String> tokens = new HashMap<>();
    private PostgreSQLContainer base;
    private ConfigurableApplicationContext contexto;
    private JdbcTemplate admin;
    private HttpClient cliente;
    private String origen, csrf;
    private boolean legadoVerificado;

    @TestConfiguration(proxyBeanMethods = false)
    static class Componentes {
        @Bean
        @Primary
        Clock reloj006() {
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
                                "log_min_duration_sample=-1");
        base.start();
        var fuente =
                new DriverManagerDataSource(
                        base.getJdbcUrl(), base.getUsername(), base.getPassword());
        var opciones = new Properties();
        opciones.setProperty("logServerErrorDetail", "false");
        fuente.setConnectionProperties(opciones);
        admin = new JdbcTemplate(fuente);
        var previo =
                Flyway.configure()
                        .dataSource(
                                base.getJdbcUrl(), "gestion_migracion", "migracion-ficticia-prueba")
                        .defaultSchema("gestion")
                        .schemas("gestion")
                        .createSchemas(false)
                        .target("5")
                        .load();
        assertThat(previo.migrate().migrationsExecuted).isEqualTo(5);
        for (Rol rol : Rol.values()) usuario(rol.name(), rol);
        usuario("OTRO", Rol.SOLICITANTE);
        var legados = sembrarLegados();
        var antes = filasLegadas(false);
        iniciar();
        assertThat(contexto.getBean(Flyway.class).info().applied()).hasSize(6);
        assertThat(filasLegadas(true)).isEqualTo(antes);
        assertThat(
                        admin.queryForObject(
                                "SELECT count(*) FROM gestion.operaciones_idempotentes_solicitud WHERE version_huella=1",
                                Integer.class))
                .isEqualTo(3);
        cliente = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        autenticar();
        Map<UUID, String> originales = new HashMap<>();
        for (int arranque = 0; arranque < 2; arranque++) {
            if (arranque == 1) {
                contexto.close();
                iniciar();
                autenticar();
            }
            for (var legado : legados) {
                var respuesta =
                        enviar(
                                "POST",
                                "/api/solicitudes/"
                                        + legado.id()
                                        + "/"
                                        + legado.tipo().toLowerCase(Locale.ROOT),
                                legado.tipo().equals("RECHAZAR")
                                        ? "{\"version\":2,\"motivo\":\"Motivo legado ficticio\"}"
                                        : "{\"version\":"
                                                + (legado.tipo().equals("PRESENTAR") ? 1 : 2)
                                                + "}",
                                legado.tipo().equals("PRESENTAR") ? "SOLICITANTE" : "SUPERVISOR",
                                true,
                                legado.clave().toString());
                assertThat(respuesta.statusCode()).as(respuesta.body()).isEqualTo(200);
                if (arranque == 0) originales.put(legado.clave(), respuesta.body());
                else assertThat(respuesta.body()).isEqualTo(originales.get(legado.clave()));
                assertThat(json.readTree(respuesta.body()).path("estado").asString())
                        .isEqualTo(legado.estado());
                var recuperada =
                        consultar(
                                legado.clave(),
                                legado.tipo().equals("PRESENTAR") ? "SOLICITANTE" : "SUPERVISOR");
                assertThat(recuperada.path("resultado").path("version").asLong())
                        .isEqualTo(legado.tipo().equals("PRESENTAR") ? 2 : 3);
            }
        }
        assertThat(filasLegadas(true)).isEqualTo(antes);
        legadoVerificado = true;
    }

    private void usuario(String nombre, Rol rol) {
        UUID id = UUID.randomUUID();
        usuarios.put(nombre, id);
        admin.update(
                "INSERT INTO gestion.usuarios(id,correo,nombre_visible,clave_hash,creado_en,actualizado_en) VALUES (?,?,?,'$argon2id$ficticio',?,?)",
                id,
                correo(nombre),
                "Cuenta ficticia " + nombre,
                Timestamp.from(AHORA.minusSeconds(5)),
                Timestamp.from(AHORA.minusSeconds(5)));
        admin.update(
                "INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES (?,?)", id, rol.name());
    }

    private record Legado(UUID id, UUID clave, String tipo, String estado) {}

    private List<Legado> sembrarLegados() {
        UUID proveedor = UUID.randomUUID();
        admin.update(
                "INSERT INTO gestion.proveedores(id,tipo,denominacion,pais_fiscal,identificador_fiscal,identificador_fiscal_normalizado,creado_en,actualizado_en) VALUES (?,'PROFESIONAL','Legado ficticio','ES','LEGADO006','LEGADO006',?,?)",
                proveedor,
                Timestamp.from(AHORA.minusSeconds(5)),
                Timestamp.from(AHORA.minusSeconds(5)));
        var registros = new ArrayList<Legado>();
        int contador = 0;
        for (String tipo : List.of("PRESENTAR", "APROBAR", "RECHAZAR")) {
            UUID id = UUID.randomUUID(), clave = UUID.randomUUID();
            String estado =
                    tipo.equals("PRESENTAR")
                            ? "PRESENTADA"
                            : tipo.equals("APROBAR") ? "APROBADA" : "RECHAZADA";
            String numero = "SOL-2026-99999" + (++contador);
            long version = tipo.equals("PRESENTAR") ? 2 : 3;
            admin.update(
                    "INSERT INTO gestion.solicitudes(id,numero,autor_id,proveedor_id,supervisor_id,asunto,moneda,estado,total,version,proveedor_denominacion,proveedor_pais_fiscal,proveedor_identificador_fiscal,proveedor_tipo,creado_en,actualizado_en,presentado_en) VALUES (?,?,?,?,?,'Asunto legado','EUR',?,10,?,'Legado ficticio','ES','LEGADO006','PROFESIONAL',?,?,?)",
                    id,
                    numero,
                    usuarios.get("SOLICITANTE"),
                    proveedor,
                    usuarios.get("SUPERVISOR"),
                    estado,
                    version,
                    Timestamp.from(AHORA.minusSeconds(5)),
                    Timestamp.from(AHORA.minusSeconds(1)),
                    Timestamp.from(AHORA.minusSeconds(2)));
            Instant actualizado =
                    tipo.equals("PRESENTAR") ? AHORA.minusSeconds(2) : AHORA.minusSeconds(1);
            String texto = tipo.equals("RECHAZAR") ? "S22:Motivo legado ficticio" : "N";
            String huella =
                    HuellaOperacion.hash(
                            tipo
                                    + ":"
                                    + id
                                    + ":"
                                    + (tipo.equals("PRESENTAR") ? "1" : "2:" + texto));
            admin.update(
                    "INSERT INTO gestion.operaciones_idempotentes_solicitud(usuario_id,clave,solicitud_id,operacion,huella,resultado_numero,resultado_estado,resultado_version,resultado_actualizado_en,resultado_presentado_en,resultado_moneda,resultado_total,creado_en,resultado_decidido_en) VALUES (?,?,?,?,?,?,?,?,?,?,'EUR',10,?,?)",
                    usuarios.get(tipo.equals("PRESENTAR") ? "SOLICITANTE" : "SUPERVISOR"),
                    clave,
                    id,
                    tipo,
                    huella,
                    numero,
                    estado,
                    version,
                    Timestamp.from(actualizado),
                    Timestamp.from(AHORA.minusSeconds(2)),
                    Timestamp.from(actualizado),
                    tipo.equals("PRESENTAR") ? null : Timestamp.from(actualizado));
            registros.add(new Legado(id, clave, tipo, estado));
        }
        return registros;
    }

    private List<String> filasLegadas(boolean nuevas) {
        return admin.queryForList(
                "SELECT (to_jsonb(t)"
                        + (nuevas
                                ? "-'version_huella'-'recurso_id'-'proveedor_id'-'estado_http'-'resultado_json'"
                                : "")
                        + ")::text FROM gestion.operaciones_idempotentes_solicitud t ORDER BY clave",
                String.class);
    }

    private void iniciar() {
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
    }

    private void autenticar() throws Exception {
        String hash = contexto.getBean(Contrasenas.class).codificar(CLAVE);
        admin.update("UPDATE gestion.usuarios SET clave_hash=?", hash);
        for (String rol : usuarios.keySet())
            tokens.put(
                    rol,
                    contexto.getBean(ServicioAutenticacion.class)
                            .iniciar(correo(rol), CLAVE)
                            .orElseThrow()
                            .accessToken());
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
        admin.execute(
                "TRUNCATE gestion.decisiones_solicitud,gestion.operaciones_idempotentes_solicitud,gestion.conceptos_solicitud,gestion.solicitudes,gestion.proveedores");
        admin.update("UPDATE gestion.usuarios SET habilitado=true");
        for (Rol rol : Rol.values())
            admin.update(
                    "INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES (?,?) ON CONFLICT DO NOTHING",
                    usuarios.get(rol.name()),
                    rol.name());
    }

    @AfterAll
    void cerrar() {
        if (contexto != null) contexto.close();
        if (cliente != null) cliente.close();
        if (base != null) base.stop();
    }

    @Test
    void v6PreservaTodosLosCamposHashesYTresReplaysLegados() {
        assertThat(legadoVerificado).isTrue();
        assertThat(contexto.getBean(Flyway.class).migrate().migrationsExecuted).isZero();
        assertThat(
                        admin.queryForObject(
                                "SELECT has_function_privilege('gestion_app','gestion.roles_para_operacion(uuid)','EXECUTE')",
                                Boolean.class))
                .isTrue();
        assertThat(
                        admin.queryForObject(
                                "SELECT has_table_privilege('gestion_app','gestion.operaciones_idempotentes_solicitud','UPDATE,DELETE')",
                                Boolean.class))
                .isFalse();
    }

    @Test
    void sieteOperacionesExigenUuidSinReducirIdentidadNiCsrf() throws Exception {
        var proveedor = proveedor();
        var solicitud = preparada();
        var rutas =
                List.of(
                        "/api/proveedores",
                        "/api/proveedores/" + proveedor.id() + "/desactivar",
                        "/api/proveedores/" + proveedor.id() + "/reactivar",
                        "/api/solicitudes",
                        "/api/solicitudes/" + solicitud.id() + "/presentar",
                        "/api/solicitudes/" + solicitud.id() + "/aprobar",
                        "/api/solicitudes/" + solicitud.id() + "/rechazar");
        for (String ruta : rutas) {
            String rol =
                    ruta.contains("proveedores")
                            ? "ADMINISTRADOR"
                            : ruta.endsWith("aprobar") || ruta.endsWith("rechazar")
                                    ? "SUPERVISOR"
                                    : "SOLICITANTE";
            String cuerpo =
                    ruta.equals("/api/proveedores")
                            ? cuerpoProveedor("Nuevo", UUID.randomUUID().toString())
                            : ruta.equals("/api/solicitudes")
                                    ? "{\"asunto\":\"Asunto válido\"}"
                                    : ruta.endsWith("rechazar")
                                            ? "{\"version\":1,\"motivo\":\"Motivo válido ficticio\"}"
                                            : "{\"version\":1}";
            for (String clave : Arrays.asList(null, "", "1-1-1-1-1", "texto"))
                error(enviar("POST", ruta, cuerpo, rol, true, clave), 400, "SOLICITUD_INVALIDA");
            error(
                    enviar("POST", ruta, cuerpo, null, true, UUID.randomUUID().toString()),
                    401,
                    "NO_AUTENTICADO");
            error(
                    enviar("POST", ruta, cuerpo, rol, false, UUID.randomUUID().toString()),
                    403,
                    "ACCESO_NO_PERMITIDO");
        }
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isZero();
    }

    @Test
    void proveedorReplayOriginalTrasEditarYEstadosNoOpCompatibles() throws Exception {
        UUID clave = UUID.randomUUID();
        String cuerpo = cuerpoProveedor("Nombre original", "ＡＢ １２３");
        var creado =
                enviar("POST", "/api/proveedores", cuerpo, "ADMINISTRADOR", true, clave.toString());
        assertThat(creado.statusCode()).isEqualTo(201);
        UUID id = UUID.fromString(json.readTree(creado.body()).path("id").asString());
        var equivalente =
                enviar(
                        "POST",
                        "/api/proveedores",
                        cuerpoProveedor("  Nombre original  ", "ab 123"),
                        "ADMINISTRADOR",
                        true,
                        clave.toString());
        assertThat(equivalente.body()).isEqualTo(creado.body());
        contexto.getBean(ServicioProveedores.class)
                .modificar(
                        actorAdmin(),
                        id,
                        0,
                        new DatosProveedor(
                                TipoProveedor.PROFESIONAL,
                                "Modificado",
                                "ES",
                                "OTRO006",
                                null,
                                null));
        assertThat(
                        enviar(
                                        "POST",
                                        "/api/proveedores",
                                        cuerpo,
                                        "ADMINISTRADOR",
                                        true,
                                        clave.toString())
                                .body())
                .isEqualTo(creado.body());
        assertThat(
                        enviar(
                                        "POST",
                                        "/api/proveedores",
                                        cuerpo,
                                        "ADMINISTRADOR",
                                        true,
                                        clave.toString())
                                .headers()
                                .firstValue("Location"))
                .isEqualTo(creado.headers().firstValue("Location"));
        UUID baja = UUID.randomUUID();
        String ruta = "/api/proveedores/" + id + "/desactivar";
        var desactivado =
                enviar("POST", ruta, "{\"version\":1}", "ADMINISTRADOR", true, baja.toString());
        assertThat(desactivado.statusCode()).isEqualTo(200);
        assertThat(
                        enviar(
                                        "POST",
                                        ruta,
                                        "{\"version\":1}",
                                        "ADMINISTRADOR",
                                        true,
                                        baja.toString())
                                .body())
                .isEqualTo(desactivado.body());
        var noOp =
                enviar(
                        "POST",
                        ruta,
                        "{\"version\":2}",
                        "ADMINISTRADOR",
                        true,
                        UUID.randomUUID().toString());
        assertThat(noOp.body()).isEqualTo(desactivado.body());
        UUID alta = UUID.randomUUID();
        var reactivado =
                enviar(
                        "POST",
                        "/api/proveedores/" + id + "/reactivar",
                        "{\"version\":2}",
                        "ADMINISTRADOR",
                        true,
                        alta.toString());
        assertThat(reactivado.statusCode()).isEqualTo(200);
        assertThat(
                        enviar(
                                        "POST",
                                        ruta,
                                        "{\"version\":1}",
                                        "ADMINISTRADOR",
                                        true,
                                        baja.toString())
                                .body())
                .isEqualTo(desactivado.body());
        assertThat(consultar(baja, "ADMINISTRADOR").path("resultado").path("estado").asString())
                .isEqualTo("INACTIVO");
        assertThat(consultar(alta, "ADMINISTRADOR").path("resultado").path("estado").asString())
                .isEqualTo("ACTIVO");
        assertThat(cuenta("proveedores")).isEqualTo(1);
    }

    @Test
    void borradorReplayExactoReconstruyeConstantesSinUsarEstadoActual() throws Exception {
        UUID clave = UUID.randomUUID();
        String cuerpo = "{\"asunto\":\"  Asunto original  \"}";
        var original =
                enviar("POST", "/api/solicitudes", cuerpo, "SOLICITANTE", true, clave.toString());
        assertThat(original.statusCode()).as(original.body()).isEqualTo(201);
        UUID id = UUID.fromString(json.readTree(original.body()).path("id").asString());
        contexto.getBean(ServicioSolicitudes.class)
                .guardar(
                        actorSolicitud("SOLICITANTE"),
                        id,
                        0,
                        new DatosBorrador("Asunto cambiado", null, null, null, List.of(), Set.of()),
                        UUID.randomUUID());
        assertThat(
                        enviar(
                                        "POST",
                                        "/api/solicitudes",
                                        "{\"asunto\":\"Asunto original\"}",
                                        "SOLICITANTE",
                                        true,
                                        clave.toString())
                                .body())
                .isEqualTo(original.body());
        JsonNode snapshot =
                json.readTree(
                        admin.queryForObject(
                                "SELECT resultado_json::text FROM gestion.operaciones_idempotentes_solicitud WHERE clave=?",
                                String.class,
                                clave));
        assertThat(snapshot.propertyNames())
                .containsExactlyInAnyOrder("id", "numero", "autor", "asunto", "creadoEn");
        assertThat(consultar(clave, "SOLICITANTE").path("resultado").path("version").asLong())
                .isZero();
        assertThat(cuenta("solicitudes")).isEqualTo(1);
    }

    @Test
    void claveGlobalRechazaOperacionRecursoVersionYEntradaDistintos() throws Exception {
        var p = proveedor();
        UUID clave = UUID.randomUUID();
        assertThat(
                        enviar(
                                        "POST",
                                        "/api/proveedores/" + p.id() + "/desactivar",
                                        "{\"version\":0}",
                                        "ADMINISTRADOR",
                                        true,
                                        clave.toString())
                                .statusCode())
                .isEqualTo(200);
        error(
                enviar(
                        "POST",
                        "/api/proveedores/" + p.id() + "/reactivar",
                        "{\"version\":1}",
                        "ADMINISTRADOR",
                        true,
                        clave.toString()),
                409,
                "CLAVE_IDEMPOTENCIA_REUTILIZADA");
        error(
                enviar(
                        "POST",
                        "/api/proveedores/" + proveedor().id() + "/desactivar",
                        "{\"version\":0}",
                        "ADMINISTRADOR",
                        true,
                        clave.toString()),
                409,
                "CLAVE_IDEMPOTENCIA_REUTILIZADA");
        error(
                enviar(
                        "POST",
                        "/api/proveedores/" + p.id() + "/desactivar",
                        "{\"version\":1}",
                        "ADMINISTRADOR",
                        true,
                        clave.toString()),
                409,
                "CLAVE_IDEMPOTENCIA_REUTILIZADA");
        error(
                enviar(
                        "POST",
                        "/api/proveedores",
                        cuerpoProveedor("Otra", "OTRA006"),
                        "ADMINISTRADOR",
                        true,
                        clave.toString()),
                409,
                "CLAVE_IDEMPOTENCIA_REUTILIZADA");
        UUID borrador = UUID.randomUUID();
        assertThat(
                        enviar(
                                        "POST",
                                        "/api/solicitudes",
                                        "{\"asunto\":\"Primero\"}",
                                        "SOLICITANTE",
                                        true,
                                        borrador.toString())
                                .statusCode())
                .isEqualTo(201);
        error(
                enviar(
                        "POST",
                        "/api/solicitudes",
                        "{\"asunto\":\"Segundo\"}",
                        "SOLICITANTE",
                        true,
                        borrador.toString()),
                409,
                "CLAVE_IDEMPOTENCIA_REUTILIZADA");
    }

    @Test
    void veinteClavesDistintasCompitenMismaVersionSinDuplicarTransicion() throws Exception {
        var s = preparada();
        long inicio = System.nanoTime();
        int exitos = 0, conflictos = 0;
        try (var hilos = Executors.newFixedThreadPool(20)) {
            CountDownLatch salida = new CountDownLatch(1);
            var futuros = new ArrayList<Future<HttpResponse<String>>>();
            for (int i = 0; i < 20; i++)
                futuros.add(
                        hilos.submit(
                                () -> {
                                    salida.await();
                                    return enviar(
                                            "POST",
                                            "/api/solicitudes/" + s.id() + "/presentar",
                                            "{\"version\":1}",
                                            "SOLICITANTE",
                                            true,
                                            UUID.randomUUID().toString());
                                }));
            salida.countDown();
            for (var futuro : futuros) {
                var r = futuro.get(10, TimeUnit.SECONDS);
                if (r.statusCode() == 200) exitos++;
                else {
                    error(r, 409, "SOLICITUD_NO_EDITABLE");
                    conflictos++;
                }
            }
        }
        assertThat(exitos).isEqualTo(1);
        assertThat(conflictos).isEqualTo(19);
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isEqualTo(1);
        assertThat(
                        contexto.getBean(ServicioSolicitudes.class)
                                .consultar(actorSolicitud("SOLICITANTE"), s.id())
                                .version())
                .isEqualTo(2);
        System.out.println(
                "MEDICION006 veinte_claves_mismo_agregado_ms="
                        + TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - inicio));
    }

    @Test
    void v6RechazaMonedaNulaEnResultadoPresentacionYDecision() throws Exception {
        var s = preparada();
        contexto.getBean(ServicioSolicitudes.class)
                .presentar(
                        actorSolicitud("SOLICITANTE"),
                        s.id(),
                        s.version(),
                        UUID.randomUUID(),
                        UUID.randomUUID());
        contexto.getBean(ServicioSolicitudes.class)
                .decidir(
                        actorSolicitud("SUPERVISOR"),
                        s.id(),
                        2,
                        UUID.randomUUID(),
                        new DatosDecision(DatosDecision.Tipo.APROBAR, null, null),
                        UUID.randomUUID());
        for (String tipo : List.of("PRESENTAR", "APROBAR"))
            assertThatThrownBy(
                            () ->
                                    admin.update(
                                            "INSERT INTO gestion.operaciones_idempotentes_solicitud(usuario_id,clave,solicitud_id,operacion,huella,resultado_numero,resultado_estado,resultado_version,resultado_actualizado_en,resultado_presentado_en,resultado_moneda,resultado_total,creado_en,resultado_decidido_en,recurso_id,version_huella,estado_http) SELECT usuario_id,?,solicitud_id,operacion,huella,resultado_numero,resultado_estado,resultado_version,resultado_actualizado_en,resultado_presentado_en,NULL,resultado_total,creado_en,resultado_decidido_en,recurso_id,version_huella,estado_http FROM gestion.operaciones_idempotentes_solicitud WHERE operacion=?",
                                            UUID.randomUUID(),
                                            tipo))
                    .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test
    void recuperacionSoloPropietarioPermisoActualYProyeccionMinima() throws Exception {
        for (String rol : List.of("ADMINISTRADOR", "SOLICITANTE", "SUPERVISOR")) {
            UUID clave = UUID.randomUUID();
            String ruta, cuerpo;
            if (rol.equals("ADMINISTRADOR")) {
                ruta = "/api/proveedores";
                cuerpo = cuerpoProveedor("Privado", "FISCAL-" + UUID.randomUUID());
            } else if (rol.equals("SOLICITANTE")) {
                ruta = "/api/solicitudes";
                cuerpo = "{\"asunto\":\"Asunto privado\"}";
            } else {
                var s = preparada();
                contexto.getBean(ServicioSolicitudes.class)
                        .presentar(
                                actorSolicitud("SOLICITANTE"),
                                s.id(),
                                s.version(),
                                UUID.randomUUID(),
                                UUID.randomUUID());
                ruta = "/api/solicitudes/" + s.id() + "/aprobar";
                cuerpo = "{\"version\":2,\"comentario\":\"Texto privado\"}";
            }
            assertThat(enviar("POST", ruta, cuerpo, rol, true, clave.toString()).statusCode())
                    .isBetween(200, 201);
            var recuperada = consultar(clave, rol);
            assertThat(recuperada.propertyNames())
                    .containsExactlyInAnyOrder("estado", "operacion", "recursoId", "resultado");
            assertThat(recuperada.path("resultado").propertyNames())
                    .isSubsetOf("estadoHttp", "id", "version", "estado", "numero");
            assertThat(recuperada.toString())
                    .doesNotContain("Privado", "privado", "huella", "resultado_json", "clave");
            error(
                    enviar(
                            "GET",
                            "/api/operaciones-idempotentes/" + clave,
                            null,
                            "OTRO",
                            false,
                            null),
                    404,
                    "OPERACION_NO_ENCONTRADA");
            admin.update(
                    "DELETE FROM gestion.usuarios_roles WHERE usuario_id=? AND rol=?",
                    usuarios.get(rol),
                    rol);
            try {
                error(
                        enviar("POST", ruta, cuerpo, rol, true, clave.toString()),
                        403,
                        "ACCESO_NO_PERMITIDO");
                error(
                        enviar(
                                "GET",
                                "/api/operaciones-idempotentes/" + clave,
                                null,
                                rol,
                                false,
                                null),
                        404,
                        "OPERACION_NO_ENCONTRADA");
            } finally {
                admin.update(
                        "INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES (?,?)",
                        usuarios.get(rol),
                        rol);
            }
            admin.update(
                    "UPDATE gestion.usuarios SET habilitado=false WHERE id=?", usuarios.get(rol));
            error(
                    enviar("GET", "/api/operaciones-idempotentes/" + clave, null, rol, false, null),
                    401,
                    "NO_AUTENTICADO");
            admin.update(
                    "UPDATE gestion.usuarios SET habilitado=true WHERE id=?", usuarios.get(rol));
        }
        error(
                enviar(
                        "GET",
                        "/api/operaciones-idempotentes/" + UUID.randomUUID(),
                        null,
                        "SOLICITANTE",
                        false,
                        null),
                404,
                "OPERACION_NO_ENCONTRADA");
        error(
                enviar(
                        "GET",
                        "/api/operaciones-idempotentes/no-uuid",
                        null,
                        "SOLICITANTE",
                        false,
                        null),
                400,
                "SOLICITUD_INVALIDA");
    }

    @Test
    void veintePeticionesHttpMismaClaveUnEfectoYRespuestasIdenticas() throws Exception {
        UUID clave = UUID.randomUUID();
        String cuerpo = cuerpoProveedor("Veinte concurrentes", "CONC006");
        admin.execute(
                "CREATE FUNCTION gestion.esperar006() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(-60061234); RETURN NEW; END $$");
        admin.execute(
                "CREATE TRIGGER esperar006 BEFORE INSERT ON gestion.proveedores FOR EACH ROW EXECUTE FUNCTION gestion.esperar006()");
        long inicio = System.nanoTime();
        try (var bloqueo = bloqueo(-60061234);
                var hilos = Executors.newFixedThreadPool(20)) {
            CountDownLatch salida = new CountDownLatch(1);
            var futuros = new ArrayList<Future<HttpResponse<String>>>();
            for (int i = 0; i < 20; i++)
                futuros.add(
                        hilos.submit(
                                () -> {
                                    salida.await();
                                    return enviar(
                                            "POST",
                                            "/api/proveedores",
                                            cuerpo,
                                            "ADMINISTRADOR",
                                            true,
                                            clave.toString());
                                }));
            salida.countDown();
            esperar(
                    () -> operaciones().esperasEnCurso() >= 19,
                    "diecinueve duplicados esperan sin conexión");
            bloqueo.commit();
            String original = null;
            for (var futuro : futuros) {
                var r = futuro.get(10, TimeUnit.SECONDS);
                assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
                if (original == null) original = r.body();
                else assertThat(r.body()).isEqualTo(original);
            }
        } finally {
            admin.execute("DROP TRIGGER esperar006 ON gestion.proveedores");
            admin.execute("DROP FUNCTION gestion.esperar006()");
        }
        assertThat(cuenta("proveedores")).isEqualTo(1);
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isEqualTo(1);
        System.out.println(
                "MEDICION006 veinte_misma_clave_ms="
                        + TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - inicio));
    }

    @Test
    void veintePeticionesHttpClavesDistintasCreanVeinteResultados() throws Exception {
        long inicio = System.nanoTime();
        Set<String> ids = new HashSet<>();
        try (var hilos = Executors.newFixedThreadPool(20)) {
            CountDownLatch salida = new CountDownLatch(1);
            var futuros = new ArrayList<Future<HttpResponse<String>>>();
            for (int i = 0; i < 20; i++)
                futuros.add(
                        hilos.submit(
                                () -> {
                                    salida.await();
                                    return enviar(
                                            "POST",
                                            "/api/solicitudes",
                                            "{\"asunto\":\"Veinte distintas\"}",
                                            "SOLICITANTE",
                                            true,
                                            UUID.randomUUID().toString());
                                }));
            salida.countDown();
            for (var futuro : futuros) {
                var r = futuro.get(10, TimeUnit.SECONDS);
                assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
                ids.add(json.readTree(r.body()).path("id").asString());
            }
        }
        assertThat(ids).hasSize(20);
        assertThat(cuenta("solicitudes")).isEqualTo(20);
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isEqualTo(20);
        System.out.println(
                "MEDICION006 veinte_distintas_ms="
                        + TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - inicio));
    }

    @Test
    void esperaPostgresAcotadaRetryAfterYRecuperacionEnProgreso() throws Exception {
        UUID clave = UUID.randomUUID();
        String cuerpo = cuerpoProveedor("Pendiente", "ESPERA006");
        try (var bloqueo = bloqueo(HuellaOperacion.bloqueo(usuarios.get("ADMINISTRADOR"), clave));
                var hilos = Executors.newSingleThreadExecutor()) {
            long inicio = System.nanoTime();
            var futuro =
                    hilos.submit(
                            () ->
                                    enviar(
                                            "POST",
                                            "/api/proveedores",
                                            cuerpo,
                                            "ADMINISTRADOR",
                                            true,
                                            clave.toString()));
            esperar(() -> operaciones().esperasEnCurso() == 1, "advisory lock PG ocupado");
            var progreso = consultar(clave, "ADMINISTRADOR");
            assertThat(progreso.path("estado").asString()).isEqualTo("EN_PROGRESO");
            assertThat(progreso.has("resultado")).isFalse();
            var r = futuro.get(5, TimeUnit.SECONDS);
            long ms = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - inicio);
            error(r, 409, "OPERACION_EN_PROGRESO");
            assertThat(r.headers().firstValue("Retry-After")).hasValue("1");
            assertThat(ms).isBetween(2900L, 3500L);
            System.out.println("MEDICION006 espera_advisory_http_ms=" + ms);
            assertThat(cuenta("proveedores")).isZero();
            bloqueo.commit();
        }
        assertThat(
                        enviar(
                                        "POST",
                                        "/api/proveedores",
                                        cuerpo,
                                        "ADMINISTRADOR",
                                        true,
                                        clave.toString())
                                .statusCode())
                .isEqualTo(201);
    }

    @Test
    void duplicadoConPoolCompletoNoEsperaConexionYRollbackLiberaClave() throws Exception {
        UUID clave = UUID.randomUUID();
        var peticion =
                PeticionOperacion.de(
                        TipoOperacion.CREAR_PROVEEDOR,
                        usuarios.get("ADMINISTRADOR"),
                        clave,
                        null,
                        null,
                        "PROFESIONAL",
                        "Pool",
                        "ES",
                        "POOL006",
                        null,
                        null);
        CountDownLatch ejecutando = new CountDownLatch(1), liberar = new CountDownLatch(1);
        var conexiones = new ArrayList<Connection>();
        try (var hilos = Executors.newSingleThreadExecutor()) {
            var titular =
                    hilos.submit(
                            () ->
                                    operaciones()
                                            .ejecutar(
                                                    peticion,
                                                    Proveedor.class,
                                                    () -> {
                                                        ejecutando.countDown();
                                                        try {
                                                            liberar.await();
                                                        } catch (InterruptedException e) {
                                                            Thread.currentThread().interrupt();
                                                        }
                                                        throw new IllegalStateException(
                                                                "rollback controlado");
                                                    }));
            assertThat(ejecutando.await(5, TimeUnit.SECONDS)).isTrue();
            try {
                for (int i = 0; i < 4; i++)
                    conexiones.add(contexto.getBean(DataSource.class).getConnection());
                long inicio = System.nanoTime();
                assertThatThrownBy(
                                () ->
                                        operaciones()
                                                .ejecutar(
                                                        peticion,
                                                        Proveedor.class,
                                                        () -> {
                                                            throw new AssertionError(
                                                                    "No debe ejecutar");
                                                        }))
                        .hasMessage("OPERACION_EN_PROGRESO");
                long ms = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - inicio);
                assertThat(ms).isBetween(2900L, 3300L);
                System.out.println("MEDICION006 duplicado_pool_completo_ms=" + ms);
            } finally {
                for (var conexion : conexiones) conexion.close();
                liberar.countDown();
            }
            assertThatThrownBy(() -> titular.get(5, TimeUnit.SECONDS))
                    .hasCauseInstanceOf(IllegalStateException.class);
        }
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isZero();
        assertThat(
                        enviar(
                                        "POST",
                                        "/api/proveedores",
                                        cuerpoProveedor("Pool", "POOL006"),
                                        "ADMINISTRADOR",
                                        true,
                                        clave.toString())
                                .statusCode())
                .isEqualTo(201);
    }

    @Test
    void rollbackRealTrasEfectoAntesRegistroNoMemorizaErrorYReintentoFunciona() throws Exception {
        UUID clave = UUID.randomUUID();
        String cuerpo = cuerpoProveedor("Rollback", "ROLLBACK006");
        admin.execute(
                "CREATE FUNCTION gestion.fallar006() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo controlado'; END $$");
        admin.execute(
                "CREATE TRIGGER fallar006 BEFORE INSERT ON gestion.operaciones_idempotentes_solicitud FOR EACH ROW EXECUTE FUNCTION gestion.fallar006()");
        try {
            error(
                    enviar(
                            "POST",
                            "/api/proveedores",
                            cuerpo,
                            "ADMINISTRADOR",
                            true,
                            clave.toString()),
                    500,
                    "ERROR_INTERNO");
        } finally {
            admin.execute("DROP TRIGGER fallar006 ON gestion.operaciones_idempotentes_solicitud");
            admin.execute("DROP FUNCTION gestion.fallar006()");
        }
        assertThat(cuenta("proveedores")).isZero();
        assertThat(cuenta("operaciones_idempotentes_solicitud")).isZero();
        error(
                enviar(
                        "GET",
                        "/api/operaciones-idempotentes/" + clave,
                        null,
                        "ADMINISTRADOR",
                        false,
                        null),
                404,
                "OPERACION_NO_ENCONTRADA");
        assertThat(
                        enviar(
                                        "POST",
                                        "/api/proveedores",
                                        cuerpo,
                                        "ADMINISTRADOR",
                                        true,
                                        clave.toString())
                                .statusCode())
                .isEqualTo(201);
        UUID invalida = UUID.randomUUID();
        error(
                enviar(
                        "POST",
                        "/api/solicitudes",
                        "{\"asunto\":\"ab\"}",
                        "SOLICITANTE",
                        true,
                        invalida.toString()),
                400,
                "SOLICITUD_INVALIDA");
        assertThat(
                        enviar(
                                        "POST",
                                        "/api/solicitudes",
                                        "{\"asunto\":\"Asunto corregido\"}",
                                        "SOLICITANTE",
                                        true,
                                        invalida.toString())
                                .statusCode())
                .isEqualTo(201);
    }

    @Test
    void respuestaPerdidaDespuesCommitYReinicioRecuperanResultadoOriginal() throws Exception {
        UUID clave = UUID.randomUUID();
        String cuerpo = cuerpoProveedor("Antes reinicio", "REINICIO006");
        var original =
                enviar("POST", "/api/proveedores", cuerpo, "ADMINISTRADOR", true, clave.toString());
        assertThat(original.statusCode()).isEqualTo(201);
        // El cliente descarta el éxito recibido: solo conserva el descriptor, como respuesta
        // perdida.
        String id = json.readTree(original.body()).path("id").asString();
        assertThat(consultar(clave, "ADMINISTRADOR").path("resultado").path("id").asString())
                .isEqualTo(id);
        contexto.close();
        iniciar();
        autenticar();
        assertThat(consultar(clave, "ADMINISTRADOR").path("resultado").path("id").asString())
                .isEqualTo(id);
        assertThat(
                        enviar(
                                        "POST",
                                        "/api/proveedores",
                                        cuerpo,
                                        "ADMINISTRADOR",
                                        true,
                                        clave.toString())
                                .body())
                .isEqualTo(original.body());
        assertThat(cuenta("proveedores")).isEqualTo(1);
    }

    @Test
    void postgresInaccesibleDa503TambienAntesDelControladorPorIdentidad() throws Exception {
        UUID clave = UUID.randomUUID();
        assertThat(
                        enviar(
                                        "POST",
                                        "/api/solicitudes",
                                        "{\"asunto\":\"Dependencia\"}",
                                        "SOLICITANTE",
                                        true,
                                        clave.toString())
                                .statusCode())
                .isEqualTo(201);
        var docker = DockerClientFactory.instance().client();
        docker.pauseContainerCmd(base.getContainerId()).exec();
        try {
            error(
                    enviar(
                            "GET",
                            "/api/operaciones-idempotentes/" + clave,
                            null,
                            "SOLICITANTE",
                            false,
                            null),
                    503,
                    "DEPENDENCIA_NO_DISPONIBLE");
        } finally {
            docker.unpauseContainerCmd(base.getContainerId()).exec();
        }
        assertThat(consultar(clave, "SOLICITANTE").path("estado").asString())
                .isEqualTo("COMPLETADA");
    }

    @Test
    void openApiDeclaraSieteClavesUuidRecuperacionYErrores() throws Exception {
        var contrato = json.readTree(enviar("GET", "/v3/api-docs", null, null, false, null).body());
        for (String ruta :
                List.of(
                        "/api/proveedores",
                        "/api/proveedores/{id}/desactivar",
                        "/api/proveedores/{id}/reactivar",
                        "/api/solicitudes",
                        "/api/solicitudes/{id}/presentar",
                        "/api/solicitudes/{id}/aprobar",
                        "/api/solicitudes/{id}/rechazar")) {
            var parametros = contrato.path("paths").path(ruta).path("post").path("parameters");
            boolean encontrada = false;
            for (var parametro : parametros)
                if (parametro.path("name").asString().equals("Idempotency-Key")) {
                    encontrada = true;
                    assertThat(parametro.path("required").asBoolean()).isTrue();
                    assertThat(parametro.path("schema").path("format").asString())
                            .isEqualTo("uuid");
                }
            assertThat(encontrada).as(ruta).isTrue();
            assertThat(
                            contrato.path("paths")
                                    .path(ruta)
                                    .path("post")
                                    .path("responses")
                                    .path("409")
                                    .path("headers")
                                    .has("Retry-After"))
                    .isTrue();
        }
        assertThat(
                        contrato.path("paths")
                                .path("/api/operaciones-idempotentes/{clave}")
                                .path("get")
                                .path("responses")
                                .propertyNames())
                .contains("200", "400", "401", "404", "503");
    }

    private ServicioOperaciones operaciones() {
        return contexto.getBean(ServicioOperaciones.class);
    }

    private ActorProveedor actorAdmin() {
        return new ActorProveedor(usuarios.get("ADMINISTRADOR"), Set.of(Rol.ADMINISTRADOR));
    }

    private ActorSolicitud actorSolicitud(String rol) {
        return new ActorSolicitud(usuarios.get(rol), Set.of(Rol.valueOf(rol)));
    }

    private Proveedor proveedor() {
        return contexto.getBean(ServicioProveedores.class)
                .crear(
                        actorAdmin(),
                        new DatosProveedor(
                                TipoProveedor.PROFESIONAL,
                                "Proveedor ficticio",
                                "ES",
                                UUID.randomUUID().toString(),
                                null,
                                null));
    }

    private Solicitud preparada() {
        var servicio = contexto.getBean(ServicioSolicitudes.class);
        var actor = actorSolicitud("SOLICITANTE");
        var s = servicio.crear(actor, "Solicitud preparada", UUID.randomUUID());
        return servicio.guardar(
                actor,
                s.id(),
                0,
                new DatosBorrador(
                        "Solicitud preparada",
                        null,
                        proveedor().id(),
                        usuarios.get("SUPERVISOR"),
                        List.of(
                                new Concepto(
                                        UUID.randomUUID(),
                                        "Concepto ficticio",
                                        new BigDecimal("1.000"),
                                        Concepto.Unidad.UNIDAD,
                                        new BigDecimal("10.0000"),
                                        null,
                                        1)),
                        Set.of()),
                UUID.randomUUID());
    }

    private String cuerpoProveedor(String nombre, String fiscal) {
        return json.writeValueAsString(
                Map.of(
                        "tipo",
                        "PROFESIONAL",
                        "denominacion",
                        nombre,
                        "paisFiscal",
                        "ES",
                        "identificadorFiscal",
                        fiscal));
    }

    private static String correo(String rol) {
        return rol.toLowerCase(Locale.ROOT) + "006@ejemplo.invalid";
    }

    private long cuenta(String tabla) {
        return admin.queryForObject("SELECT count(*) FROM gestion." + tabla, Long.class);
    }

    private JsonNode consultar(UUID clave, String rol) throws Exception {
        var r = enviar("GET", "/api/operaciones-idempotentes/" + clave, null, rol, false, null);
        assertThat(r.statusCode()).as(r.body()).isEqualTo(200);
        return json.readTree(r.body());
    }

    private HttpResponse<String> enviar(
            String metodo, String ruta, String cuerpo, String rol, boolean xsrf, String clave)
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
        if (rol != null) p.header("Authorization", "Bearer " + tokens.get(rol));
        if (xsrf) p.header("Cookie", "XSRF-TOKEN=" + csrf).header("X-XSRF-TOKEN", csrf);
        if (clave != null) p.header("Idempotency-Key", clave);
        return cliente.send(p.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static void error(HttpResponse<String> r, int estado, String codigo) {
        assertThat(r.statusCode()).as(r.body()).isEqualTo(estado);
        assertThat(r.body()).isEqualTo("{\"error\":\"" + codigo + "\"}");
        assertThat(r.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
    }

    private Connection bloqueo(long clave) throws SQLException {
        var c =
                DriverManager.getConnection(
                        base.getJdbcUrl(), base.getUsername(), base.getPassword());
        c.setAutoCommit(false);
        try (var s = c.prepareStatement("SELECT pg_advisory_xact_lock(?)")) {
            s.setLong(1, clave);
            s.executeQuery().close();
        }
        return c;
    }

    private void esperar(java.util.function.BooleanSupplier condicion, String descripcion)
            throws InterruptedException {
        long limite = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(2500);
        while (!condicion.getAsBoolean() && System.nanoTime() < limite) Thread.sleep(10);
        assertThat(condicion.getAsBoolean()).as(descripcion).isTrue();
    }
}
