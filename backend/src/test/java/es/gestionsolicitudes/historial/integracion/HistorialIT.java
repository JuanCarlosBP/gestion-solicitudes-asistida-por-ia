package es.gestionsolicitudes.historial.integracion;

import static org.assertj.core.api.Assertions.*;

import es.gestionsolicitudes.GestionSolicitudesApplication;
import es.gestionsolicitudes.historial.aplicacion.*;
import es.gestionsolicitudes.historial.dominio.*;
import es.gestionsolicitudes.identidad.aplicacion.*;
import es.gestionsolicitudes.identidad.dominio.Rol;
import es.gestionsolicitudes.integracion.ContenedoresPrueba;
import es.gestionsolicitudes.operaciones.dominio.HuellaOperacion;
import es.gestionsolicitudes.proveedores.aplicacion.ServicioProveedores;
import es.gestionsolicitudes.proveedores.dominio.*;
import es.gestionsolicitudes.solicitudes.aplicacion.ServicioSolicitudes;
import es.gestionsolicitudes.solicitudes.dominio.*;
import java.math.BigDecimal;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class HistorialIT {
    private static final String IMAGEN =
            "postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826";
    private static final Instant AHORA = Instant.parse("2026-10-15T18:15:00.123456Z");
    private static final String CLAVE = "contraseña ficticia exclusiva pruebas007";
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
        Clock reloj007() {
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
                                "log_statement=none");
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
                        .target("6")
                        .load();
        assertThat(previo.migrate().migrationsExecuted).isEqualTo(6);
        for (Rol rol : Rol.values()) usuario(rol.name(), rol);
        usuario("OTRO", Rol.SOLICITANTE);
        usuario("OTRO_SUPERVISOR", Rol.SUPERVISOR);
        usuario("MULTI", Rol.SOLICITANTE);
        admin.update(
                "INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES (?,'SUPERVISOR')",
                usuarios.get("MULTI"));
        var legados = sembrarLegados();
        var antes = fotografia();
        var checksums =
                admin.queryForList(
                        "SELECT version,checksum FROM gestion.flyway_schema_history ORDER BY installed_rank");
        iniciar();
        assertThat(contexto.getBean(Flyway.class).info().applied()).hasSize(7);
        assertThat(fotografia()).isEqualTo(antes);
        assertThat(
                        admin.queryForList(
                                "SELECT version,checksum FROM gestion.flyway_schema_history WHERE version<>'7' ORDER BY installed_rank"))
                .isEqualTo(checksums);
        assertThat(cuenta("eventos_historial")).isZero();
        cliente = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        autenticar();
        for (UUID id : legados) {
            var pagina = get("/api/solicitudes/" + id + "/historial", "AUDITOR");
            assertThat(pagina.path("historiaAnteriorDesconocida").asBoolean()).isTrue();
            assertThat(pagina.path("totalElementos").asLong()).isEqualTo(1);
            assertThat(pagina.path("elementos").get(0).path("id").asString())
                    .startsWith("DECISION:");
            assertThat(
                            pagina.path("elementos")
                                    .get(0)
                                    .path("actor")
                                    .path("nombreVisible")
                                    .asString())
                    .isEqualTo("Nombre histórico original");
            assertThat(
                            get(
                                            "/api/solicitudes/"
                                                    + id
                                                    + "/historial?accion=BORRADOR_CREADO",
                                            "AUDITOR")
                                    .path("historiaAnteriorDesconocida")
                                    .asBoolean())
                    .isTrue();
        }
        for (var legado :
                admin.queryForList(
                        "SELECT clave,solicitud_id,operacion FROM gestion.operaciones_idempotentes_solicitud")) {
            boolean aprobar = legado.get("operacion").equals("APROBAR");
            var replay =
                    enviar(
                            "POST",
                            "/api/solicitudes/"
                                    + legado.get("solicitud_id")
                                    + (aprobar ? "/aprobar" : "/rechazar"),
                            aprobar
                                    ? "{\"version\":2,\"comentario\":\"Comentario privado legado\"}"
                                    : "{\"version\":2,\"motivo\":\"Motivo privado legado\"}",
                            "SUPERVISOR",
                            (UUID) legado.get("clave"));
            assertThat(replay.statusCode()).as(replay.body()).isEqualTo(200);
        }
        assertThat(cuenta("eventos_historial")).isZero();
        assertThat(fotografia()).isEqualTo(antes);
        legadoVerificado = true;
    }

    private List<UUID> sembrarLegados() {
        UUID proveedor = UUID.randomUUID();
        var fecha = Timestamp.from(AHORA.minusSeconds(30));
        admin.update(
                "INSERT INTO gestion.proveedores(id,tipo,denominacion,pais_fiscal,identificador_fiscal,identificador_fiscal_normalizado,creado_en,actualizado_en) VALUES (?,'PROFESIONAL','Legado ficticio','ES','LEGADO007','LEGADO007',?,?)",
                proveedor,
                fecha,
                fecha);
        var ids = new ArrayList<UUID>();
        int numero = 0;
        for (String tipo : List.of("APROBAR", "RECHAZAR")) {
            UUID id = UUID.randomUUID();
            ids.add(id);
            String estado = tipo.equals("APROBAR") ? "APROBADA" : "RECHAZADA";
            String publico = "SOL-2026-99999" + (++numero);
            admin.update(
                    "INSERT INTO gestion.solicitudes(id,numero,autor_id,proveedor_id,supervisor_id,asunto,moneda,estado,total,version,proveedor_denominacion,proveedor_pais_fiscal,proveedor_identificador_fiscal,proveedor_tipo,creado_en,actualizado_en,presentado_en) VALUES (?,?,?,?,?,'Legado privado','EUR',?,10,3,'Legado ficticio','ES','LEGADO007','PROFESIONAL',?,?,?)",
                    id,
                    publico,
                    usuarios.get("SOLICITANTE"),
                    proveedor,
                    usuarios.get("SUPERVISOR"),
                    estado,
                    fecha,
                    fecha,
                    fecha);
            admin.update(
                    "INSERT INTO gestion.decisiones_solicitud(id,solicitud_id,actor_id,actor_nombre_visible,tipo,comentario,motivo,decidido_en,version_anterior,version_resultante,peticion_id) VALUES (?,?,?,'Nombre histórico original',?,?,?,?,2,3,?)",
                    UUID.randomUUID(),
                    id,
                    usuarios.get("SUPERVISOR"),
                    tipo,
                    tipo.equals("APROBAR") ? "Comentario privado legado" : null,
                    tipo.equals("RECHAZAR") ? "Motivo privado legado" : null,
                    fecha,
                    UUID.randomUUID());
            String texto =
                    tipo.equals("APROBAR")
                            ? "S25:Comentario privado legado"
                            : "S21:Motivo privado legado";
            admin.update(
                    "INSERT INTO gestion.operaciones_idempotentes_solicitud(usuario_id,clave,solicitud_id,operacion,huella,resultado_numero,resultado_estado,resultado_version,resultado_actualizado_en,resultado_presentado_en,resultado_moneda,resultado_total,creado_en,resultado_decidido_en,recurso_id) VALUES (?,?,?,?,?,?,?,3,?,?,'EUR',10,?,?,?)",
                    usuarios.get("SUPERVISOR"),
                    UUID.randomUUID(),
                    id,
                    tipo,
                    HuellaOperacion.hash(tipo + ":" + id + ":2:" + texto),
                    publico,
                    estado,
                    fecha,
                    fecha,
                    fecha,
                    fecha,
                    id);
        }
        return ids;
    }

    private void usuario(String nombre, Rol rol) {
        UUID id = UUID.randomUUID();
        usuarios.put(nombre, id);
        admin.update(
                "INSERT INTO gestion.usuarios(id,correo,nombre_visible,clave_hash,creado_en,actualizado_en) VALUES (?,?,?,'$argon2id$ficticio',?,?)",
                id,
                correo(nombre),
                "Cuenta ficticia " + nombre,
                Timestamp.from(AHORA.minusSeconds(60)),
                Timestamp.from(AHORA.minusSeconds(60)));
        admin.update(
                "INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES (?,?)", id, rol.name());
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
        admin.update(
                "UPDATE gestion.usuarios SET clave_hash=?",
                contexto.getBean(Contrasenas.class).codificar(CLAVE));
        for (String nombre : usuarios.keySet())
            tokens.put(
                    nombre,
                    contexto.getBean(ServicioAutenticacion.class)
                            .iniciar(correo(nombre), CLAVE)
                            .orElseThrow()
                            .accessToken());
        csrf =
                enviar("GET", "/api/autenticacion/csrf", null, null, null)
                        .headers()
                        .allValues("Set-Cookie")
                        .stream()
                        .filter(v -> v.startsWith("XSRF-TOKEN="))
                        .findFirst()
                        .orElseThrow()
                        .split(";", 2)[0]
                        .substring(11);
    }

    @BeforeEach
    void limpiar() {
        admin.execute(
                "TRUNCATE gestion.eventos_historial,gestion.decisiones_solicitud,gestion.operaciones_idempotentes_solicitud,gestion.conceptos_solicitud,gestion.solicitudes,gestion.proveedores");
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
    void v6AV7ConservaDatosChecksumsYDecisionesSinInventarHechos() {
        assertThat(legadoVerificado).isTrue();
        assertThat(contexto.getBean(Flyway.class).migrate().migrationsExecuted).isZero();
    }

    @Test
    void sieteAccionesAtómicasDecisionUnicaReplayNoopYNombreFotografiado() throws Exception {
        UUID clave = UUID.randomUUID();
        var datos = datosProveedor();
        var p = proveedores().crearIdempotente(actorAdmin(), datos, clave);
        assertThat(proveedores().crearIdempotente(actorAdmin(), datos, clave)).isEqualTo(p);
        proveedores().modificar(actorAdmin(), p.id(), 0, datos);
        UUID baja = UUID.randomUUID();
        proveedores().cambiarEstadoIdempotente(actorAdmin(), p.id(), 1, false, baja);
        proveedores().cambiarEstadoIdempotente(actorAdmin(), p.id(), 1, false, baja);
        proveedores().cambiarEstadoIdempotente(actorAdmin(), p.id(), 2, false, UUID.randomUUID());
        proveedores().cambiarEstadoIdempotente(actorAdmin(), p.id(), 2, true, UUID.randomUUID());
        assertThat(cuenta("eventos_historial")).isEqualTo(4);
        var s = preparada("SOLICITANTE", p.id(), "SUPERVISOR");
        UUID presentar = UUID.randomUUID();
        solicitudes().presentar(actor("SOLICITANTE"), s.id(), 1, presentar, UUID.randomUUID());
        solicitudes().presentar(actor("SOLICITANTE"), s.id(), 1, presentar, UUID.randomUUID());
        UUID decidir = UUID.randomUUID();
        var decision = new DatosDecision(DatosDecision.Tipo.APROBAR, "Comentario PRIVADO007", null);
        solicitudes().decidir(actor("SUPERVISOR"), s.id(), 2, decidir, decision, UUID.randomUUID());
        solicitudes().decidir(actor("SUPERVISOR"), s.id(), 2, decidir, decision, UUID.randomUUID());
        assertThat(cuenta("eventos_historial")).isEqualTo(7);
        assertThat(cuenta("decisiones_solicitud")).isEqualTo(1);
        var pagina = get("/api/solicitudes/" + s.id() + "/historial", "SOLICITANTE");
        assertThat(acciones(pagina))
                .containsExactly(
                        "APROBADA", "SOLICITUD_PRESENTADA", "BORRADOR_GUARDADO", "BORRADOR_CREADO");
        assertThat(pagina.path("historiaAnteriorDesconocida").asBoolean()).isFalse();
        assertThat(
                        get(
                                        "/api/solicitudes/"
                                                + s.id()
                                                + "/historial?accion=RECHAZADA",
                                        "SOLICITANTE")
                                .path("historiaAnteriorDesconocida")
                                .asBoolean())
                .isFalse();
        admin.update(
                "UPDATE gestion.usuarios SET nombre_visible='Nombre cambiado' WHERE id=?",
                usuarios.get("ADMINISTRADOR"));
        try {
            assertThat(
                            get("/api/proveedores/" + p.id() + "/historial", "AUDITOR")
                                    .path("elementos")
                                    .get(0)
                                    .path("actor")
                                    .path("nombreVisible")
                                    .asString())
                    .isEqualTo("Cuenta ficticia ADMINISTRADOR");
        } finally {
            admin.update(
                    "UPDATE gestion.usuarios SET nombre_visible='Cuenta ficticia ADMINISTRADOR' WHERE id=?",
                    usuarios.get("ADMINISTRADOR"));
        }
        String respuesta = get("/api/historial?size=100", "AUDITOR").toString();
        assertThat(respuesta)
                .doesNotContain(
                        "PRIVADO007",
                        "fiscal",
                        "correo",
                        "telefono",
                        "descripcion",
                        "conceptos",
                        "comentario",
                        "motivo",
                        "clave",
                        "huella",
                        "peticion");
        assertThat(
                        json.readTree(
                                        enviar(
                                                        "GET",
                                                        "/api/solicitudes/" + s.id(),
                                                        null,
                                                        "SOLICITANTE",
                                                        null)
                                                .body())
                                .path("decision")
                                .path("comentario")
                                .asString())
                .isEqualTo("Comentario PRIVADO007");
    }

    @Test
    void rechazoSeProyectaUnaVezSinMotivoYLecturasNoEscriben() throws Exception {
        var s = presentada();
        solicitudes()
                .decidir(
                        actor("SUPERVISOR"),
                        s.id(),
                        2,
                        UUID.randomUUID(),
                        new DatosDecision(
                                DatosDecision.Tipo.RECHAZAR, null, "Motivo PRIVADO007 obligatorio"),
                        UUID.randomUUID());
        var antes = fotografia();
        for (int i = 0; i < 3; i++) {
            var p = get("/api/solicitudes/" + s.id() + "/historial", "SUPERVISOR");
            assertThat(acciones(p))
                    .containsExactly(
                            "RECHAZADA",
                            "SOLICITUD_PRESENTADA",
                            "BORRADOR_GUARDADO",
                            "BORRADOR_CREADO");
            assertThat(p.toString()).doesNotContain("PRIVADO007", "motivo");
        }
        assertThat(fotografia()).isEqualTo(antes);
    }

    @Test
    void falloDeEventoRevierteAltasModificacionConceptosPresentacionYResultado() throws Exception {
        var p = proveedor();
        var s = preparada("SOLICITANTE", p.id(), "SUPERVISOR");
        var antes = fotografia();
        long eventosAntes = cuenta("eventos_historial");
        UUID clave = UUID.randomUUID();
        admin.execute(
                "CREATE FUNCTION gestion.fallar007() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo controlado'; END $$");
        admin.execute(
                "CREATE TRIGGER fallar007 BEFORE INSERT ON gestion.eventos_historial FOR EACH ROW EXECUTE FUNCTION gestion.fallar007()");
        try {
            error(
                    enviar(
                            "POST",
                            "/api/proveedores",
                            json.writeValueAsString(
                                    Map.of(
                                            "tipo",
                                            "PROFESIONAL",
                                            "denominacion",
                                            "Rollback",
                                            "paisFiscal",
                                            "ES",
                                            "identificadorFiscal",
                                            "ROLLBACK007")),
                            "ADMINISTRADOR",
                            clave),
                    500,
                    "ERROR_INTERNO");
            error(
                    enviar(
                            "POST",
                            "/api/solicitudes",
                            "{\"asunto\":\"Rollback borrador\"}",
                            "SOLICITANTE",
                            UUID.randomUUID()),
                    500,
                    "ERROR_INTERNO");
            assertThatThrownBy(
                            () ->
                                    proveedores()
                                            .modificar(actorAdmin(), p.id(), 0, datosProveedor()))
                    .isInstanceOf(org.springframework.dao.DataAccessException.class);
            assertThatThrownBy(
                            () ->
                                    proveedores()
                                            .cambiarEstadoIdempotente(
                                                    actorAdmin(),
                                                    p.id(),
                                                    0,
                                                    false,
                                                    UUID.randomUUID()))
                    .isInstanceOf(org.springframework.dao.DataAccessException.class);
            assertThatThrownBy(
                            () ->
                                    solicitudes()
                                            .guardar(
                                                    actor("SOLICITANTE"),
                                                    s.id(),
                                                    1,
                                                    new DatosBorrador(
                                                            "Cambio rechazado",
                                                            null,
                                                            p.id(),
                                                            usuarios.get("SUPERVISOR"),
                                                            List.of(),
                                                            Set.of()),
                                                    UUID.randomUUID()))
                    .isInstanceOf(org.springframework.dao.DataAccessException.class);
            error(
                    enviar(
                            "POST",
                            "/api/solicitudes/" + s.id() + "/presentar",
                            "{\"version\":1}",
                            "SOLICITANTE",
                            UUID.randomUUID()),
                    500,
                    "ERROR_INTERNO");
            assertThat(fotografia()).isEqualTo(antes);
            assertThat(cuenta("eventos_historial")).isEqualTo(eventosAntes);
        } finally {
            admin.execute("DROP TRIGGER fallar007 ON gestion.eventos_historial");
            admin.execute("DROP FUNCTION gestion.fallar007()");
        }
        assertThat(
                        enviar(
                                        "POST",
                                        "/api/proveedores",
                                        json.writeValueAsString(
                                                Map.of(
                                                        "tipo",
                                                        "PROFESIONAL",
                                                        "denominacion",
                                                        "Rollback",
                                                        "paisFiscal",
                                                        "ES",
                                                        "identificadorFiscal",
                                                        "ROLLBACK007")),
                                        "ADMINISTRADOR",
                                        clave)
                                .statusCode())
                .isEqualTo(201);
    }

    @Test
    void permisosPorRecursoOcultacionYRevocacionConJwtAnterior() throws Exception {
        var p = proveedor();
        var s = preparada("SOLICITANTE", p.id(), "SUPERVISOR");
        String ruta = "/api/solicitudes/" + s.id() + "/historial";
        error(enviar("GET", ruta, null, null, null), 401, "NO_AUTENTICADO");
        for (String rol : List.of("OTRO", "SUPERVISOR", "OTRO_SUPERVISOR"))
            error(enviar("GET", ruta, null, rol, null), 404, "SOLICITUD_NO_ENCONTRADA");
        get(ruta, "SOLICITANTE");
        get(ruta, "AUDITOR");
        get(ruta, "ADMINISTRADOR");
        solicitudes()
                .presentar(actor("SOLICITANTE"), s.id(), 1, UUID.randomUUID(), UUID.randomUUID());
        get(ruta, "SUPERVISOR");
        error(enviar("GET", ruta, null, "OTRO_SUPERVISOR", null), 404, "SOLICITUD_NO_ENCONTRADA");
        for (String rol : List.of("SOLICITANTE", "SUPERVISOR")) {
            error(
                    enviar("GET", "/api/proveedores/" + p.id() + "/historial", null, rol, null),
                    404,
                    "PROVEEDOR_NO_ENCONTRADO");
            error(enviar("GET", "/api/historial", null, rol, null), 403, "ACCESO_NO_PERMITIDO");
        }
        error(
                enviar(
                        "GET",
                        "/api/proveedores/" + UUID.randomUUID() + "/historial",
                        null,
                        "AUDITOR",
                        null),
                404,
                "PROVEEDOR_NO_ENCONTRADO");
        admin.update(
                "DELETE FROM gestion.usuarios_roles WHERE usuario_id=?",
                usuarios.get("SUPERVISOR"));
        error(enviar("GET", ruta, null, "SUPERVISOR", null), 404, "SOLICITUD_NO_ENCONTRADA");
        error(enviar("GET", "/api/resumen", null, "SUPERVISOR", null), 403, "ACCESO_NO_PERMITIDO");
        admin.update(
                "DELETE FROM gestion.usuarios_roles WHERE usuario_id=?", usuarios.get("AUDITOR"));
        error(enviar("GET", "/api/historial", null, "AUDITOR", null), 403, "ACCESO_NO_PERMITIDO");
        error(
                enviar("GET", "/api/proveedores/" + p.id() + "/historial", null, "AUDITOR", null),
                404,
                "PROVEEDOR_NO_ENCONTRADO");
        admin.update(
                "UPDATE gestion.usuarios SET habilitado=false WHERE id=?",
                usuarios.get("ADMINISTRADOR"));
        error(enviar("GET", "/api/historial", null, "ADMINISTRADOR", null), 401, "NO_AUTENTICADO");
    }

    @Test
    void resumenRealMultirrolSinDuplicadosNiPendientesAjenos() throws Exception {
        var p = proveedor();
        preparada("SOLICITANTE", p.id(), "SUPERVISOR");
        var presentada = preparada("SOLICITANTE", p.id(), "SUPERVISOR");
        solicitudes()
                .presentar(
                        actor("SOLICITANTE"),
                        presentada.id(),
                        1,
                        UUID.randomUUID(),
                        UUID.randomUUID());
        var aprobada = preparada("OTRO", p.id(), "MULTI");
        solicitudes()
                .presentar(actor("OTRO"), aprobada.id(), 1, UUID.randomUUID(), UUID.randomUUID());
        solicitudes()
                .decidir(
                        actor("MULTI"),
                        aprobada.id(),
                        2,
                        UUID.randomUUID(),
                        new DatosDecision(DatosDecision.Tipo.APROBAR, null, null),
                        UUID.randomUUID());
        var asignada = preparada("OTRO", p.id(), "MULTI");
        solicitudes()
                .presentar(actor("OTRO"), asignada.id(), 1, UUID.randomUUID(), UUID.randomUUID());
        var propia = preparada("MULTI", p.id(), "SUPERVISOR");
        // Una asignación en borrador no convierte al supervisor en lector.
        preparada("OTRO", p.id(), "SUPERVISOR");
        var multi = get("/api/resumen", "MULTI");
        assertThat(multi.path("solicitudes").path("total").asLong()).isEqualTo(3);
        assertThat(multi.path("solicitudes").path("BORRADOR").asLong()).isEqualTo(1);
        assertThat(multi.path("solicitudes").path("APROBADA").asLong()).isEqualTo(1);
        assertThat(multi.path("accionesPendientes").path("borradoresPropios").asLong())
                .isEqualTo(1);
        assertThat(multi.path("accionesPendientes").path("presentadasAsignadas").asLong())
                .isEqualTo(1);
        get("/api/solicitudes/" + propia.id() + "/historial", "MULTI");
        get("/api/solicitudes/" + aprobada.id() + "/historial", "MULTI");
        var supervisor = get("/api/resumen", "SUPERVISOR");
        assertThat(supervisor.path("solicitudes").path("total").asLong()).isEqualTo(1);
        assertThat(supervisor.path("accionesPendientes").path("presentadasAsignadas").asLong())
                .isEqualTo(1);
        for (String global : List.of("AUDITOR", "ADMINISTRADOR")) {
            var r = get("/api/resumen", global);
            assertThat(r.path("solicitudes").path("total").asLong()).isEqualTo(6);
            assertThat(r.path("accionesPendientes").path("borradoresPropios").asLong()).isZero();
            assertThat(r.path("accionesPendientes").path("presentadasAsignadas").asLong()).isZero();
        }
        admin.update(
                "INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES (?,'AUDITOR')",
                usuarios.get("MULTI"));
        try {
            assertThat(get("/api/resumen", "MULTI").path("solicitudes").path("total").asLong())
                    .isEqualTo(6);
        } finally {
            admin.update(
                    "DELETE FROM gestion.usuarios_roles WHERE usuario_id=? AND rol='AUDITOR'",
                    usuarios.get("MULTI"));
        }
    }

    @Test
    void filtrosCerradosFechasInclusivasEmpatesYConteoCorrecto() throws Exception {
        var s = presentada();
        solicitudes()
                .decidir(
                        actor("SUPERVISOR"),
                        s.id(),
                        2,
                        UUID.randomUUID(),
                        new DatosDecision(DatosDecision.Tipo.APROBAR, null, null),
                        UUID.randomUUID());
        // Administrador de la fixture fuerza el empate y colisión UUID entre fuentes, nunca la app.
        UUID decision =
                admin.queryForObject(
                        "SELECT id FROM gestion.decisiones_solicitud WHERE solicitud_id=?",
                        UUID.class,
                        s.id());
        admin.update(
                "UPDATE gestion.eventos_historial SET id=? WHERE recurso_id=? AND accion='SOLICITUD_PRESENTADA'",
                decision,
                s.id());
        admin.update("UPDATE gestion.eventos_historial SET ocurrido_en=?", Timestamp.from(AHORA));
        admin.update(
                "UPDATE gestion.decisiones_solicitud SET decidido_en=?", Timestamp.from(AHORA));
        var todos = get("/api/historial?size=100", "AUDITOR");
        List<String> esperados = new ArrayList<>();
        for (var e : todos.path("elementos")) esperados.add(e.path("id").asString());
        assertThat(esperados)
                .isSortedAccordingTo(Comparator.reverseOrder())
                .doesNotHaveDuplicates();
        List<String> paginas = new ArrayList<>();
        for (int i = 0; i < esperados.size(); i++) {
            var pagina = get("/api/historial?size=1&page=" + i, "AUDITOR");
            assertThat(pagina.path("totalElementos").asLong()).isEqualTo(esperados.size());
            paginas.add(pagina.path("elementos").get(0).path("id").asString());
        }
        assertThat(paginas).isEqualTo(esperados);
        String instante =
                URLEncoder.encode("2026-10-15T20:15:00.123456+02:00", StandardCharsets.UTF_8);
        var filtro =
                get(
                        "/api/historial?tipoRecurso=SOLICITUD&recursoId="
                                + s.id()
                                + "&accion=APROBADA&actor="
                                + usuarios.get("SUPERVISOR")
                                + "&desde="
                                + instante
                                + "&hasta="
                                + instante,
                        "AUDITOR");
        assertThat(filtro.path("totalElementos").asLong()).isEqualTo(1);
        assertThat(filtro.path("elementos").get(0).path("id").asString())
                .isEqualTo("DECISION:" + decision);
        assertThat(get("/api/historial?page=1000&size=100", "AUDITOR").path("elementos").size())
                .isZero();
        for (String query :
                List.of(
                        "size=0",
                        "size=101",
                        "page=-1",
                        "page=1001&size=100",
                        "page=0&page=1",
                        "sort=fecha",
                        "actor=incorrecto",
                        "actor=",
                        "accion=APROBAR",
                        "accion=%27%20OR%201%3D1",
                        "tipoRecurso=OTRO",
                        "recursoId=x",
                        "desde=2026-02-30T00:00:00Z",
                        "desde=2026-10-15",
                        "desde=2026-10-15T00:00:00",
                        "desde=2026-10-16T00:00:00Z&hasta=2026-10-15T00:00:00Z"))
            error(
                    enviar("GET", "/api/historial?" + query, null, "AUDITOR", null),
                    400,
                    "SOLICITUD_INVALIDA");
        error(
                enviar(
                        "GET",
                        "/api/solicitudes/" + s.id() + "/historial?recursoId=" + s.id(),
                        null,
                        "AUDITOR",
                        null),
                400,
                "SOLICITUD_INVALIDA");
        error(
                enviar("GET", "/api/resumen?page=0", null, "AUDITOR", null),
                400,
                "SOLICITUD_INVALIDA");
    }

    @Test
    void appendOnlyConRestriccionesYRegistroExigeTransaccion() throws Exception {
        var p = proveedor();
        try (var c =
                        DriverManager.getConnection(
                                base.getJdbcUrl(), "gestion_app", "aplicacion-ficticia-prueba");
                var s = c.createStatement()) {
            for (String sql :
                    List.of(
                            "UPDATE gestion.eventos_historial SET accion='PROVEEDOR_MODIFICADO'",
                            "DELETE FROM gestion.eventos_historial",
                            "TRUNCATE gestion.eventos_historial",
                            "ALTER TABLE gestion.eventos_historial ADD COLUMN extra text"))
                assertThatThrownBy(() -> s.execute(sql))
                        .isInstanceOf(SQLException.class)
                        .satisfies(
                                e ->
                                        assertThat(((SQLException) e).getSQLState())
                                                .isEqualTo("42501"));
        }
        assertThatThrownBy(
                        () ->
                                contexto.getBean(RegistroHistorial.class)
                                        .registrar(
                                                new CambioHistorial(
                                                        TipoRecurso.PROVEEDOR,
                                                        p.id(),
                                                        AccionHistorial.PROVEEDOR_MODIFICADO,
                                                        usuarios.get("ADMINISTRADOR"),
                                                        0L,
                                                        1,
                                                        "ACTIVO",
                                                        "ACTIVO",
                                                        AHORA,
                                                        null)))
                .isInstanceOf(
                        org.springframework.transaction.IllegalTransactionStateException.class);
        for (String alteracion :
                List.of(
                        "accion='APROBADA'",
                        "tipo_recurso='OTRO'",
                        "version_resultante=-1",
                        "estado_resultante='INACTIVO'",
                        "version_anterior=0",
                        "actor_nombre_visible=''",
                        "solicitud_id=recurso_id"))
            assertThatThrownBy(
                            () ->
                                    admin.execute(
                                            "UPDATE gestion.eventos_historial SET " + alteracion))
                    .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test
    void carrerasReplayYVersionGeneranSoloEfectosConfirmados() throws Exception {
        UUID clave = UUID.randomUUID();
        var datos = datosProveedor();
        CountDownLatch salir = new CountDownLatch(1);
        try (var hilos = Executors.newFixedThreadPool(12)) {
            List<Future<Proveedor>> futuros = new ArrayList<>();
            for (int i = 0; i < 12; i++)
                futuros.add(
                        hilos.submit(
                                () -> {
                                    salir.await();
                                    return proveedores()
                                            .crearIdempotente(actorAdmin(), datos, clave);
                                }));
            salir.countDown();
            Set<UUID> ids = new HashSet<>();
            for (var futuro : futuros) ids.add(futuro.get(10, TimeUnit.SECONDS).id());
            assertThat(ids).hasSize(1);
            assertThat(cuenta("eventos_historial")).isEqualTo(1);
            UUID id = ids.iterator().next();
            CountDownLatch editar = new CountDownLatch(1);
            Callable<String> cambio =
                    () -> {
                        editar.await();
                        try {
                            proveedores().modificar(actorAdmin(), id, 0, datos);
                            return "OK";
                        } catch (ErrorProveedor e) {
                            return e.codigo().name();
                        }
                    };
            var uno = hilos.submit(cambio);
            var dos = hilos.submit(cambio);
            editar.countDown();
            assertThat(List.of(uno.get(10, TimeUnit.SECONDS), dos.get(10, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder("OK", "VERSION_OBSOLETA");
            assertThat(cuenta("eventos_historial")).isEqualTo(2);
        }
    }

    @Test
    void reinicioConservaHistorialYReplayNoDuplica() throws Exception {
        var datos = datosProveedor();
        UUID clave = UUID.randomUUID();
        var p = proveedores().crearIdempotente(actorAdmin(), datos, clave);
        String antes = get("/api/proveedores/" + p.id() + "/historial", "AUDITOR").toString();
        contexto.close();
        iniciar();
        autenticar();
        assertThat(proveedores().crearIdempotente(actorAdmin(), datos, clave)).isEqualTo(p);
        assertThat(get("/api/proveedores/" + p.id() + "/historial", "AUDITOR").toString())
                .isEqualTo(antes);
        assertThat(cuenta("eventos_historial")).isEqualTo(1);
    }

    @Test
    void openApiCompletoSinRutasMutablesYErroresTipados() throws Exception {
        var api = json.readTree(enviar("GET", "/v3/api-docs", null, null, null).body());
        for (String ruta :
                List.of(
                        "/api/historial",
                        "/api/solicitudes/{id}/historial",
                        "/api/proveedores/{id}/historial",
                        "/api/resumen")) {
            var item = api.path("paths").path(ruta);
            assertThat(item.propertyNames()).containsExactly("get");
            var get = item.path("get");
            assertThat(get.path("security").size()).isPositive();
            assertThat(get.path("responses").propertyNames())
                    .contains("200", "400", "401", "403", "500", "503");
            assertThat(
                            get.path("responses")
                                    .path("200")
                                    .path("content")
                                    .path("*/*")
                                    .path("schema")
                                    .path("$ref")
                                    .asString())
                    .isNotBlank();
            if (!ruta.equals("/api/resumen")) {
                List<String> nombres = new ArrayList<>();
                for (var p : get.path("parameters")) nombres.add(p.path("name").asString());
                assertThat(nombres).contains("page", "size", "accion", "actor", "desde", "hasta");
            }
        }
        assertThat(
                        api.path("components")
                                .path("schemas")
                                .path("EventoHistorial")
                                .path("properties")
                                .propertyNames())
                .containsExactlyInAnyOrder(
                        "id",
                        "tipoRecurso",
                        "recursoId",
                        "accion",
                        "actor",
                        "ocurridoEn",
                        "versionAnterior",
                        "versionResultante",
                        "estadoAnterior",
                        "estadoResultante",
                        "resumen",
                        "origen");
    }

    @Test
    void recursoAnteriorEditadoConservaAvisoAunqueTengaHechosNuevos() throws Exception {
        UUID id = UUID.randomUUID();
        admin.update(
                "INSERT INTO gestion.proveedores(id,tipo,denominacion,pais_fiscal,identificador_fiscal,identificador_fiscal_normalizado,creado_en,actualizado_en) VALUES (?,'PROFESIONAL','Anterior','ES','ANTERIOR007','ANTERIOR007',?,?)",
                id,
                Timestamp.from(AHORA.minusSeconds(60)),
                Timestamp.from(AHORA.minusSeconds(60)));
        var vacia = get("/api/proveedores/" + id + "/historial", "AUDITOR");
        assertThat(vacia.path("elementos").size()).isZero();
        assertThat(vacia.path("historiaAnteriorDesconocida").asBoolean()).isTrue();
        proveedores().modificar(actorAdmin(), id, 0, datosProveedor());
        var pagina = get("/api/proveedores/" + id + "/historial", "AUDITOR");
        assertThat(acciones(pagina)).containsExactly("PROVEEDOR_MODIFICADO");
        assertThat(pagina.path("historiaAnteriorDesconocida").asBoolean()).isTrue();
        assertThat(
                        get(
                                        "/api/proveedores/"
                                                + id
                                                + "/historial?accion=PROVEEDOR_CREADO",
                                        "AUDITOR")
                                .path("historiaAnteriorDesconocida")
                                .asBoolean())
                .isTrue();
    }

    @Test
    void volumenLocalObservadoSinPromesaDeSlaYLimitesSubmicrosegundo() throws Exception {
        var datos = datosProveedor();
        var p = proveedores().crear(actorAdmin(), datos);
        for (int version = 0; version < 250; version++)
            proveedores().modificar(actorAdmin(), p.id(), version, datos);
        long inicio = System.nanoTime();
        var pagina =
                get("/api/historial?size=20&actor=" + usuarios.get("ADMINISTRADOR"), "AUDITOR");
        long duracion = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - inicio);
        assertThat(pagina.path("totalElementos").asLong()).isEqualTo(251);
        assertThat(pagina.path("elementos").size()).isEqualTo(20);
        long bytes =
                admin.queryForObject(
                        "SELECT pg_total_relation_size('gestion.eventos_historial')", Long.class);
        assertThat(bytes).isPositive();
        System.out.println(
                "MEDICION007 eventos=251 pagina=20 duracion_http_ms="
                        + duracion
                        + " tabla_indices_bytes="
                        + bytes);
        String despues =
                URLEncoder.encode("2026-10-15T18:15:00.123456001Z", StandardCharsets.UTF_8);
        String antes = URLEncoder.encode("2026-10-15T18:15:00.123455999Z", StandardCharsets.UTF_8);
        assertThat(
                        get("/api/historial?accion=PROVEEDOR_CREADO&desde=" + despues, "AUDITOR")
                                .path("totalElementos")
                                .asLong())
                .isZero();
        assertThat(
                        get("/api/historial?accion=PROVEEDOR_CREADO&hasta=" + antes, "AUDITOR")
                                .path("totalElementos")
                                .asLong())
                .isZero();
    }

    private ServicioProveedores proveedores() {
        return contexto.getBean(ServicioProveedores.class);
    }

    private ServicioSolicitudes solicitudes() {
        return contexto.getBean(ServicioSolicitudes.class);
    }

    private ActorProveedor actorAdmin() {
        return new ActorProveedor(usuarios.get("ADMINISTRADOR"), Set.of(Rol.ADMINISTRADOR));
    }

    private ActorSolicitud actor(String nombre) {
        return new ActorSolicitud(
                usuarios.get(nombre),
                nombre.equals("MULTI")
                        ? Set.of(Rol.SOLICITANTE, Rol.SUPERVISOR)
                        : Set.of(nombre.equals("OTRO") ? Rol.SOLICITANTE : Rol.valueOf(nombre)));
    }

    private DatosProveedor datosProveedor() {
        return new DatosProveedor(
                TipoProveedor.PROFESIONAL,
                "Proveedor PRIVADO007",
                "ES",
                UUID.randomUUID().toString(),
                "privado007@ejemplo.invalid",
                "PRIVADO007");
    }

    private Proveedor proveedor() {
        return proveedores().crear(actorAdmin(), datosProveedor());
    }

    private Solicitud preparada(String autor, UUID proveedor, String supervisor) {
        UUID clave = UUID.randomUUID();
        var s =
                solicitudes()
                        .crearIdempotente(
                                actor(autor), "Asunto PRIVADO007", clave, UUID.randomUUID());
        assertThat(
                        solicitudes()
                                .crearIdempotente(
                                        actor(autor),
                                        "Asunto PRIVADO007",
                                        clave,
                                        UUID.randomUUID()))
                .isEqualTo(s);
        return solicitudes()
                .guardar(
                        actor(autor),
                        s.id(),
                        0,
                        new DatosBorrador(
                                "Asunto PRIVADO007",
                                "Descripción PRIVADO007",
                                proveedor,
                                usuarios.get(supervisor),
                                List.of(
                                        new Concepto(
                                                UUID.randomUUID(),
                                                "Concepto PRIVADO007",
                                                new BigDecimal("1.000"),
                                                Concepto.Unidad.UNIDAD,
                                                new BigDecimal("10.0000"),
                                                null,
                                                1)),
                                Set.of()),
                        UUID.randomUUID());
    }

    private Solicitud presentada() {
        var s = preparada("SOLICITANTE", proveedor().id(), "SUPERVISOR");
        solicitudes()
                .presentar(actor("SOLICITANTE"), s.id(), 1, UUID.randomUUID(), UUID.randomUUID());
        return s;
    }

    private static String correo(String nombre) {
        return nombre.toLowerCase(Locale.ROOT) + "007@ejemplo.invalid";
    }

    private long cuenta(String tabla) {
        return admin.queryForObject("SELECT count(*) FROM gestion." + tabla, Long.class);
    }

    private Map<String, List<String>> fotografia() {
        Map<String, List<String>> resultado = new TreeMap<>();
        for (String tabla :
                List.of(
                        "proveedores",
                        "solicitudes",
                        "conceptos_solicitud",
                        "decisiones_solicitud",
                        "operaciones_idempotentes_solicitud"))
            resultado.put(
                    tabla,
                    admin.queryForList(
                            "SELECT to_jsonb(t)::text FROM gestion."
                                    + tabla
                                    + " t ORDER BY to_jsonb(t)::text",
                            String.class));
        return resultado;
    }

    private List<String> acciones(JsonNode pagina) {
        List<String> r = new ArrayList<>();
        for (var e : pagina.path("elementos")) r.add(e.path("accion").asString());
        return r;
    }

    private JsonNode get(String ruta, String rol) throws Exception {
        var r = enviar("GET", ruta, null, rol, null);
        assertThat(r.statusCode()).as(r.body()).isEqualTo(200);
        assertThat(r.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
        return json.readTree(r.body());
    }

    private HttpResponse<String> enviar(
            String metodo, String ruta, String cuerpo, String rol, UUID clave) throws Exception {
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
        if (!metodo.equals("GET"))
            p.header("Cookie", "XSRF-TOKEN=" + csrf).header("X-XSRF-TOKEN", csrf);
        if (clave != null) p.header("Idempotency-Key", clave.toString());
        return cliente.send(p.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static void error(HttpResponse<String> r, int estado, String codigo) {
        assertThat(r.statusCode()).as(r.body()).isEqualTo(estado);
        assertThat(r.body()).isEqualTo("{\"error\":\"" + codigo + "\"}");
    }
}
