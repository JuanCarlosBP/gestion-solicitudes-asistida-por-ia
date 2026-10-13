package es.gestionsolicitudes.identidad.aplicacion;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import es.gestionsolicitudes.identidad.configuracion.DuracionesIdentidad;
import es.gestionsolicitudes.identidad.dominio.*;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ServicioAutenticacionTest {
    private static final Instant AHORA = Instant.parse("2026-10-14T00:00:00Z");
    private final RepositorioIdentidad repositorio = mock(RepositorioIdentidad.class);
    private final SecretosRefresco secretos = new SecretosRefresco();
    private final EmisorJwt emisor = mock(EmisorJwt.class);
    private final ServicioAutenticacion servicio =
            new ServicioAutenticacion(
                    repositorio,
                    mock(Contrasenas.class),
                    secretos,
                    emisor,
                    Clock.fixed(AHORA, ZoneOffset.UTC),
                    new DuracionesIdentidad(Duration.ofMinutes(10), Duration.ofHours(8)));

    private SesionAcceso preparar(
            SecretosRefresco.Credencial credencial,
            String estado,
            Instant expira,
            Instant revocacion,
            boolean habilitado) {
        var sesion =
                new SesionAcceso(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        credencial.id(),
                        AHORA.minusSeconds(120),
                        expira,
                        revocacion);
        var token =
                new TokenRefresco(
                        credencial.id(),
                        sesion.id(),
                        sesion.familiaId(),
                        credencial.hash(),
                        estado,
                        sesion.creadoEn(),
                        expira);
        when(repositorio.buscarToken(credencial.id())).thenReturn(Optional.of(token));
        when(repositorio.bloquearSesion(sesion.id())).thenReturn(Optional.of(sesion));
        when(repositorio.buscarUsuario(sesion.usuarioId()))
                .thenReturn(
                        Optional.of(
                                new Usuario(
                                        new UsuarioPublico(
                                                sesion.usuarioId(),
                                                "cuenta@ejemplo.invalid",
                                                "Demo",
                                                Set.of(Rol.SOLICITANTE)),
                                        "dato interno ficticio",
                                        habilitado,
                                        IntentosAcceso.vacios())));
        return sesion;
    }

    @Test
    void usuarioAusenteYCorreoInvalidoVerificanHashFicticio() {
        var repositorio = mock(RepositorioIdentidad.class);
        var claves = mock(Contrasenas.class);
        when(repositorio.buscarUsuario("ausente@ejemplo.invalid", true))
                .thenReturn(Optional.empty());
        var servicio =
                new ServicioAutenticacion(
                        repositorio,
                        claves,
                        new SecretosRefresco(),
                        mock(EmisorJwt.class),
                        Clock.fixed(Instant.parse("2026-10-14T00:00:00Z"), ZoneOffset.UTC),
                        new DuracionesIdentidad(Duration.ofMinutes(10), Duration.ofHours(8)));
        assertThat(
                        servicio.iniciar("ausente@ejemplo.invalid", "entrada ficticia de prueba")
                                .isEmpty())
                .isTrue();
        assertThat(servicio.iniciar("invalido", "entrada ficticia de prueba").isEmpty()).isTrue();
        verify(claves, times(2)).verificarFicticia("entrada ficticia de prueba");
        verify(repositorio, never()).crearSesion(any());
    }

    @Test
    void rotacionCreaNuevoHashConservaCaducidadYReleeBajoBloqueo() {
        var credencial = secretos.nueva();
        var sesion = preparar(credencial, "ACTIVO", AHORA.plusSeconds(500), null, true);
        var usuario = repositorio.buscarUsuario(sesion.usuarioId()).orElseThrow().publico();
        when(emisor.emitir(any(), any(), anyString(), eq(AHORA)))
                .thenReturn(
                        new AccesoEmitido(
                                "ficticio-no-jwt",
                                500,
                                usuario,
                                "ficticio-no-refresh",
                                sesion.expiraEn()));
        assertThat(servicio.renovar(credencial.valorCookie()).isPresent()).isTrue();
        var orden = inOrder(repositorio);
        orden.verify(repositorio).buscarToken(credencial.id());
        orden.verify(repositorio).bloquearSesion(sesion.id());
        orden.verify(repositorio).buscarToken(credencial.id());
        var captor = org.mockito.ArgumentCaptor.forClass(TokenRefresco.class);
        verify(repositorio).crearToken(captor.capture());
        var nuevo = captor.getValue();
        assertThat(nuevo.id().equals(credencial.id())).isFalse();
        assertThat(java.security.MessageDigest.isEqual(nuevo.secretoHash(), credencial.hash()))
                .isFalse();
        assertThat(nuevo.expiraEn()).isEqualTo(sesion.expiraEn());
        verify(repositorio).rotar(sesion, credencial.id(), nuevo.id(), AHORA);
    }

    @Test
    void reutilizacionDevuelveVacioSinExcepcionYOrdenaRevocacionDeFamilia() {
        var credencial = secretos.nueva();
        var sesion = preparar(credencial, "USADO", AHORA.plusSeconds(500), null, true);
        assertThat(servicio.renovar(credencial.valorCookie()).isEmpty()).isTrue();
        verify(repositorio).revocar(sesion, AHORA, "REUTILIZACION");
        verify(repositorio, never()).crearToken(any());
        verifyNoInteractions(emisor);
    }

    @Test
    void secretoIncorrectoNoEmiteNiRevocaUnaFamiliaAjena() {
        var credencial = secretos.nueva();
        preparar(credencial, "ACTIVO", AHORA.plusSeconds(500), null, true);
        String falso = credencial.id() + "." + secretos.nueva().secreto();
        assertThat(servicio.renovar(falso).isEmpty()).isTrue();
        verify(repositorio, never()).revocar(any(), any(), anyString());
        verify(repositorio, never()).crearToken(any());
        verifyNoInteractions(emisor);
    }

    @Test
    void unaSesionRevocadaOCaducadaNoSeRenueva() {
        var revocado = secretos.nueva();
        preparar(revocado, "REVOCADO", AHORA.plusSeconds(500), AHORA.minusSeconds(1), true);
        assertThat(servicio.renovar(revocado.valorCookie()).isEmpty()).isTrue();
        var caducado = secretos.nueva();
        preparar(caducado, "ACTIVO", AHORA, null, true);
        assertThat(servicio.renovar(caducado.valorCookie()).isEmpty()).isTrue();
        verify(repositorio, never()).crearToken(any());
        verifyNoInteractions(emisor);
    }

    @Test
    void usuarioDeshabilitadoRevocaSuSesionAlRenovar() {
        var credencial = secretos.nueva();
        var sesion = preparar(credencial, "ACTIVO", AHORA.plusSeconds(500), null, false);
        assertThat(servicio.renovar(credencial.valorCookie()).isEmpty()).isTrue();
        verify(repositorio).revocar(sesion, AHORA, "USUARIO_DESHABILITADO");
        verifyNoInteractions(emisor);
    }

    @Test
    void logoutSoloRevocaConCredencialAutenticaYUsaBloqueoComun() {
        var credencial = secretos.nueva();
        var sesion = preparar(credencial, "ACTIVO", AHORA.plusSeconds(500), null, true);
        servicio.cerrar(null);
        servicio.cerrar(credencial.id() + "." + secretos.nueva().secreto());
        verify(repositorio, never()).revocar(any(), any(), anyString());
        servicio.cerrar(credencial.valorCookie());
        verify(repositorio).revocar(sesion, AHORA, "CIERRE");
        verify(repositorio, times(2)).bloquearSesion(sesion.id());
    }
}
