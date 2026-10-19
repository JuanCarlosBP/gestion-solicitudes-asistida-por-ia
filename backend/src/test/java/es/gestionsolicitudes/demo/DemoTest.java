package es.gestionsolicitudes.demo;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import es.gestionsolicitudes.demo.aplicacion.CredencialesDemo;
import es.gestionsolicitudes.demo.aplicacion.ServicioDemo;
import es.gestionsolicitudes.demo.configuracion.PropiedadesDemo;
import es.gestionsolicitudes.demo.dominio.ContextoDemo;
import es.gestionsolicitudes.demo.dominio.ErrorDemo;
import es.gestionsolicitudes.demo.http.FiltroContextoDemo;
import es.gestionsolicitudes.demo.persistencia.FuenteDemo;
import es.gestionsolicitudes.demo.persistencia.RepositorioDemo;
import es.gestionsolicitudes.identidad.aplicacion.RepositorioIdentidad;
import es.gestionsolicitudes.identidad.configuracion.ValidadorJwt;
import es.gestionsolicitudes.identidad.dominio.Rol;
import jakarta.servlet.http.Cookie;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.oauth2.jwt.Jwt;

class DemoTest {
    @Test
    void reinicioReconciliaDrenajeYFalloBloqueaSinReciclarReservaActiva() {
        var repositorio = mock(RepositorioDemo.class);
        var fuente = mock(FuenteDemo.class);
        var reservado =
                new RepositorioDemo.Espacio(
                        contexto.espacio(),
                        contexto.generacion(),
                        "RESERVADO",
                        contexto.reservaId(),
                        contexto.expiraEn(),
                        1);
        when(repositorio.espacios()).thenReturn(List.of(reservado));
        var servicio = new ServicioDemo(new PropiedadesDemo(valores()), repositorio, fuente, reloj);
        servicio.reconciliar();
        verifyNoInteractions(fuente);
        verify(repositorio, never()).reciclable(any(), any());
        var drenando =
                new RepositorioDemo.Espacio(
                        contexto.espacio(),
                        contexto.generacion(),
                        "DRENANDO",
                        contexto.reservaId(),
                        contexto.expiraEn(),
                        1);
        when(repositorio.espacios()).thenReturn(List.of(drenando));
        doThrow(new IllegalStateException("fallo inducido"))
                .when(fuente)
                .drenar(contexto.espacio());
        servicio.reconciliar();
        verify(repositorio)
                .cambiar(
                        contexto.espacio(),
                        contexto.generacion(),
                        "DRENANDO",
                        "BLOQUEADO",
                        "FALLO_DRENAJE",
                        ahora);
        verify(repositorio, never()).reciclable(any(), any());
    }

    @Test
    void reservaVigenteSeReusaSinExtenderElPlazo() {
        var repositorio = mock(RepositorioDemo.class);
        when(repositorio.vigente(ServicioDemo.hash(cookie), ahora)).thenReturn(contexto);
        var reserva =
                new ServicioDemo(
                                new PropiedadesDemo(valores()),
                                repositorio,
                                mock(FuenteDemo.class),
                                reloj)
                        .reservar(cookie);
        assertThat(reserva.contexto()).isEqualTo(contexto);
        verify(repositorio, never()).reservar(any(), any());
    }

    @Test
    void provisionExigeLocalEInventarioYRuntimeNoAdmiteAdmin(@TempDir Path temporal)
            throws Exception {
        var p = valores();
        Path semilla = temporal.resolve("semilla");
        Files.writeString(semilla, Base64.getEncoder().encodeToString(new byte[32]));
        p.setProperty("semilla.ruta", semilla.toString());
        p.setProperty("admin.url", "jdbc:postgresql://localhost:5432/postgres");
        p.setProperty("admin.usuario", "ag016_provision");
        p.setProperty("admin.clave", "ficticia-test");
        p.setProperty("migracion.usuario", "gestion_migracion");
        p.setProperty("migracion.clave", "ficticia-test");
        assertThatThrownBy(() -> new PropiedadesDemo(p).exigirConfiguracionRuntime())
                .isInstanceOf(IllegalStateException.class);
        p.setProperty("entorno", "publico");
        assertThatThrownBy(
                        () ->
                                new es.gestionsolicitudes.demo.provision.ProvisionadorDemo(
                                        new PropiedadesDemo(p)))
                .isInstanceOf(IllegalStateException.class);
        p.setProperty("entorno", "local");
        p.setProperty("admin.url", "jdbc:postgresql://otro:5432/postgres");
        assertThatThrownBy(
                        () ->
                                new es.gestionsolicitudes.demo.provision.ProvisionadorDemo(
                                        new PropiedadesDemo(p)))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void loginDemoReemplazaSesionAcotaPlazoYSoloDespuesDeCredencialesValidas() {
        var repositorio = mock(RepositorioIdentidad.class);
        var claves = mock(es.gestionsolicitudes.identidad.aplicacion.Contrasenas.class);
        var emisor = mock(es.gestionsolicitudes.identidad.aplicacion.EmisorJwt.class);
        var usuario =
                new es.gestionsolicitudes.identidad.dominio.UsuarioPublico(
                        UUID.randomUUID(),
                        "cuenta@demo.invalid",
                        "Cuenta",
                        java.util.Set.of(Rol.SOLICITANTE));
        when(repositorio.buscarUsuario("cuenta@demo.invalid", true))
                .thenReturn(
                        java.util.Optional.of(
                                new es.gestionsolicitudes.identidad.dominio.Usuario(
                                        usuario,
                                        "hash-ficticio",
                                        true,
                                        es.gestionsolicitudes.identidad.dominio.IntentosAcceso
                                                .vacios())));
        when(emisor.emitir(any(), any(), any(), any()))
                .thenReturn(
                        new es.gestionsolicitudes.identidad.aplicacion.AccesoEmitido(
                                "ficticio", 60, usuario, "ficticio", contexto.expiraEn()));
        var servicio =
                new es.gestionsolicitudes.identidad.aplicacion.ServicioAutenticacion(
                        repositorio,
                        claves,
                        new es.gestionsolicitudes.identidad.aplicacion.SecretosRefresco(),
                        emisor,
                        reloj,
                        new es.gestionsolicitudes.identidad.configuracion.DuracionesIdentidad(
                                Duration.ofMinutes(10), Duration.ofHours(8)));
        ContextoDemo.instalar(contexto);
        assertThat(servicio.iniciar("cuenta@demo.invalid", "ficticia")).isEmpty();
        verify(repositorio, never()).reemplazarSesionDemo(any());
        when(claves.verificar(any(), any())).thenReturn(true);
        assertThat(servicio.iniciar("cuenta@demo.invalid", "ficticia")).isPresent();
        var captura =
                org.mockito.ArgumentCaptor.forClass(
                        es.gestionsolicitudes.identidad.dominio.SesionAcceso.class);
        var orden = inOrder(repositorio);
        orden.verify(repositorio).reemplazarSesionDemo(ahora);
        orden.verify(repositorio).crearSesion(captura.capture());
        assertThat(captura.getValue().expiraEn()).isEqualTo(contexto.expiraEn());
        ContextoDemo.limpiar();
        servicio.iniciar("cuenta@demo.invalid", "ficticia");
        verify(repositorio, times(1)).reemplazarSesionDemo(any());
    }

    private final Instant ahora = Instant.parse("2026-10-16T10:00:00Z");
    private final Clock reloj = Clock.fixed(ahora, ZoneOffset.UTC);
    private final ContextoDemo contexto =
            new ContextoDemo(
                    UUID.randomUUID(), "ag016_demo_01", UUID.randomUUID(), ahora.plusSeconds(60));
    private final String cookie = "A".repeat(43);

    @AfterEach
    void limpiar() {
        ContextoDemo.limpiar();
    }

    static Properties valores() {
        var p = new Properties();
        p.setProperty("espacios", "ag016_demo_01");
        p.setProperty("cupo", "1");
        p.setProperty("entorno", "local");
        p.setProperty("semilla.ruta", "no-se-lee-en-esta-prueba");
        p.setProperty("control.url", "jdbc:postgresql://localhost:5432/ag016_control");
        p.setProperty("control.usuario", "ag016_control_app");
        p.setProperty("control.clave", "ficticia-test");
        p.setProperty(
                "espacio.ag016_demo_01.url", "jdbc:postgresql://localhost:5432/ag016_demo_01");
        p.setProperty("espacio.ag016_demo_01.usuario", "ag016_app_01");
        p.setProperty("espacio.ag016_demo_01.clave", "ficticia-test");
        return p;
    }

    @Test
    void inventarioRechazaDestinoAjenoCredencialesIncrustadasYCupoExcesivo() {
        var p = valores();
        p.setProperty(
                "espacio.ag016_demo_01.url", "jdbc:postgresql://localhost:5432/ag016_demo_02");
        assertThatThrownBy(() -> new PropiedadesDemo(p))
                .isInstanceOf(IllegalArgumentException.class);
        p.setProperty(
                "espacio.ag016_demo_01.url",
                "jdbc:postgresql://localhost:5432/ag016_demo_01?user=postgres");
        assertThatThrownBy(() -> new PropiedadesDemo(p))
                .isInstanceOf(IllegalArgumentException.class);
        p.setProperty(
                "espacio.ag016_demo_01.url", "jdbc:postgresql://localhost:5432/ag016_demo_01");
        p.setProperty("cupo", "2");
        assertThatThrownBy(() -> new PropiedadesDemo(p))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void fuenteNuncaTieneFallbackNiPermiteElegirUsuario() {
        try (var fuente = new FuenteDemo(new PropiedadesDemo(valores()))) {
            assertThatThrownBy(fuente::getConnection).isInstanceOf(IllegalStateException.class);
            assertThatThrownBy(() -> fuente.getConnection("postgres", "ficticia"))
                    .isInstanceOf(java.sql.SQLException.class);
        }
    }

    @Test
    void contextoNoSeHeredaYSeLimpia() throws Exception {
        ContextoDemo.instalar(contexto);
        assertThat(ContextoDemo.limitar(ahora.plusSeconds(100))).isEqualTo(contexto.expiraEn());
        assertThat(ContextoDemo.limitar(ahora.plusSeconds(10))).isEqualTo(ahora.plusSeconds(10));
        try (var hilos = Executors.newSingleThreadExecutor()) {
            assertThat(hilos.submit(ContextoDemo::actual).get(2, TimeUnit.SECONDS)).isNull();
        }
        ContextoDemo.limpiar();
        assertThat(ContextoDemo.actual()).isNull();
    }

    @Test
    void hmacDistingueGeneracionEspacioYRolSinAdministrador(@TempDir Path temporal)
            throws Exception {
        Path semilla = temporal.resolve("semilla");
        Files.writeString(semilla, Base64.getEncoder().encodeToString(new byte[32]));
        var credenciales = new CredencialesDemo(semilla);
        String clave =
                credenciales.clave(contexto.espacio(), contexto.generacion(), Rol.SOLICITANTE);
        assertThat(clave.length()).isEqualTo(43);
        assertThat(
                        clave.equals(
                                credenciales.clave(
                                        contexto.espacio(),
                                        contexto.generacion(),
                                        Rol.SOLICITANTE)))
                .isTrue();
        assertThat(
                        clave.equals(
                                credenciales.clave(
                                        contexto.espacio(), UUID.randomUUID(), Rol.SOLICITANTE)))
                .isFalse();
        assertThat(
                        clave.equals(
                                credenciales.clave(
                                        "ag016_demo_02", contexto.generacion(), Rol.SOLICITANTE)))
                .isFalse();
        assertThat(
                        clave.equals(
                                credenciales.clave(
                                        contexto.espacio(), contexto.generacion(), Rol.AUDITOR)))
                .isFalse();
        assertThatThrownBy(
                        () ->
                                credenciales.clave(
                                        contexto.espacio(),
                                        contexto.generacion(),
                                        Rol.ADMINISTRADOR))
                .isInstanceOf(IllegalArgumentException.class);
        Files.writeString(semilla, Base64.getEncoder().encodeToString(new byte[31]));
        assertThatThrownBy(() -> new CredencialesDemo(semilla))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void claimsCruzadosRechazanAntesDeConsultarSid() {
        var identidad = mock(RepositorioIdentidad.class);
        var validador = new ValidadorJwt(identidad, reloj, true);
        var token =
                Jwt.withTokenValue("ficticio")
                        .header("alg", "RS256")
                        .claim("sub", UUID.randomUUID().toString())
                        .claim("demo_reserva", contexto.reservaId().toString())
                        .claim("demo_generacion", contexto.generacion().toString())
                        .claim("demo_espacio", contexto.espacio())
                        .issuer("gestion-solicitudes")
                        .audience(List.of("gestion-solicitudes-api"))
                        .claim("jti", UUID.randomUUID().toString())
                        .issuedAt(ahora)
                        .notBefore(ahora)
                        .expiresAt(ahora.plusSeconds(50))
                        .claim("sid", UUID.randomUUID().toString())
                        .claim("roles", List.of("SOLICITANTE"))
                        .build();
        assertThat(validador.validate(token).hasErrors()).isTrue();
        ContextoDemo.instalar(
                new ContextoDemo(
                        contexto.reservaId(),
                        "ag016_demo_02",
                        contexto.generacion(),
                        contexto.expiraEn()));
        assertThat(validador.validate(token).hasErrors()).isTrue();
        verifyNoInteractions(identidad);
        ContextoDemo.limpiar();
        ContextoDemo.instalar(contexto);
        when(identidad.sesionActiva(any(), any(), any())).thenReturn(true);
        assertThat(validador.validate(token).hasErrors()).isFalse();
        verify(identidad).sesionActiva(any(), any(), eq(ahora));
    }

    @Test
    void filtroLimpiaEnExcepcionYNoPermiteAsincronia() throws Exception {
        var repositorio = mock(RepositorioDemo.class);
        var fuente = mock(FuenteDemo.class);
        when(repositorio.validar(any(), any(), any())).thenReturn(contexto);
        var servicio = new ServicioDemo(new PropiedadesDemo(valores()), repositorio, fuente, reloj);
        var filtro = new FiltroContextoDemo(servicio);
        var peticion = new MockHttpServletRequest("GET", "/api/proveedores");
        peticion.addHeader("X-Demo-Contexto", contexto.selector());
        peticion.setCookies(new Cookie(FiltroContextoDemo.COOKIE, cookie));
        assertThatThrownBy(
                        () ->
                                filtro.doFilter(
                                        peticion,
                                        new MockHttpServletResponse(),
                                        (r, s) -> {
                                            assertThat(ContextoDemo.actual()).isEqualTo(contexto);
                                            assertThat(r.isAsyncSupported()).isFalse();
                                            assertThatThrownBy(r::startAsync)
                                                    .isInstanceOf(IllegalStateException.class);
                                            throw new jakarta.servlet.ServletException(
                                                    "fallo inducido");
                                        }))
                .isInstanceOf(jakarta.servlet.ServletException.class);
        assertThat(ContextoDemo.actual()).isNull();
    }

    @Test
    void ausenteYSelectorAjenoNoAccedenANegocioYBootstrapNoConsultaControl() throws Exception {
        var repositorio = mock(RepositorioDemo.class);
        var fuente = mock(FuenteDemo.class);
        var filtro =
                new FiltroContextoDemo(
                        new ServicioDemo(
                                new PropiedadesDemo(valores()), repositorio, fuente, reloj));
        for (String selector : List.of("", "ag016_demo_99:manipulado")) {
            var peticion = new MockHttpServletRequest("GET", "/api/proveedores");
            peticion.addHeader("X-Demo-Contexto", selector);
            var respuesta = new MockHttpServletResponse();
            filtro.doFilter(peticion, respuesta, (r, s) -> fail("No debe alcanzar la cadena"));
            assertThat(respuesta.getStatus()).isEqualTo(401);
        }
        filtro.doFilter(
                new MockHttpServletRequest("GET", "/api/demo"),
                new MockHttpServletResponse(),
                (r, s) -> assertThat(ContextoDemo.actual()).isNull());
        verifyNoInteractions(repositorio, fuente);
    }

    @Test
    void drenajeEsperaOperacionAdmitidaAntesDeHacerReciclable() throws Exception {
        var repositorio = mock(RepositorioDemo.class);
        var fuente = mock(FuenteDemo.class);
        var espacio =
                new RepositorioDemo.Espacio(
                        contexto.espacio(),
                        contexto.generacion(),
                        "DRENANDO",
                        contexto.reservaId(),
                        contexto.expiraEn(),
                        1);
        when(repositorio.validar(any(), any(), any())).thenReturn(contexto);
        when(repositorio.espacios()).thenReturn(List.of(espacio));
        var servicio = new ServicioDemo(new PropiedadesDemo(valores()), repositorio, fuente, reloj);
        var admitida = new java.util.concurrent.CountDownLatch(1);
        var terminar = new java.util.concurrent.CountDownLatch(1);
        try (var hilos = Executors.newSingleThreadExecutor()) {
            var operacion =
                    hilos.submit(
                            () -> {
                                servicio.<InterruptedException, RuntimeException>admitir(
                                        cookie,
                                        contexto.selector(),
                                        c -> {
                                            admitida.countDown();
                                            terminar.await();
                                        });
                                return true;
                            });
            try {
                assertThat(admitida.await(2, TimeUnit.SECONDS)).isTrue();
                servicio.reconciliar();
                verify(fuente, never()).drenar(any());
                verify(repositorio, never()).reciclable(any(), any());
            } finally {
                terminar.countDown();
            }
            assertThat(operacion.get(2, TimeUnit.SECONDS)).isTrue();
        }
        servicio.reconciliar();
        var orden = inOrder(fuente, repositorio);
        orden.verify(fuente).drenar(contexto.espacio());
        orden.verify(repositorio).reciclable(espacio, ahora);
    }

    @Test
    void almacenamientoYRateLimitNoImpidenLiberar() throws Exception {
        var repositorio = mock(RepositorioDemo.class);
        var fuente = mock(FuenteDemo.class);
        var p = valores();
        p.setProperty("almacenamiento.bytes", "1");
        p.setProperty("peticiones.minuto", "10");
        when(repositorio.validar(any(), any(), any())).thenReturn(contexto);
        when(fuente.bytes(any(), any())).thenReturn(2L);
        var servicio = new ServicioDemo(new PropiedadesDemo(p), repositorio, fuente, reloj);
        assertThatThrownBy(() -> servicio.comprobarEscritura(contexto))
                .isInstanceOf(ErrorDemo.class)
                .extracting("estado")
                .isEqualTo(507);
        for (int i = 0; i < 10; i++) servicio.limitarPeticion(contexto, false);
        assertThatThrownBy(() -> servicio.limitarPeticion(contexto, false))
                .isInstanceOf(ErrorDemo.class);
        var peticion = new MockHttpServletRequest("POST", "/api/demo/reserva/liberar");
        peticion.addHeader("X-Demo-Contexto", contexto.selector());
        peticion.setCookies(new Cookie(FiltroContextoDemo.COOKIE, cookie));
        new FiltroContextoDemo(servicio)
                .doFilter(
                        peticion,
                        new MockHttpServletResponse(),
                        (r, s) -> servicio.liberar(ContextoDemo.exigir()));
        verify(repositorio).liberar(contexto, ahora);
    }
}
