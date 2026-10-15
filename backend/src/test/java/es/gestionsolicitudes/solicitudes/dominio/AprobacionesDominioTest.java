package es.gestionsolicitudes.solicitudes.dominio;

import static org.assertj.core.api.Assertions.*;

import es.gestionsolicitudes.identidad.dominio.Rol;
import es.gestionsolicitudes.solicitudes.http.EntradaDecision;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class AprobacionesDominioTest {
    private final JsonMapper json = JsonMapper.builder().build();

    @Test
    void comentarioOpcionalRecorteUnicodeYVacioNull() {
        for (String texto : Arrays.asList(null, "", " \u00a0\u0085 "))
            assertThat(new DatosDecision(DatosDecision.Tipo.APROBAR, texto, null).comentario())
                    .isNull();
        assertThat(
                        new DatosDecision(
                                        DatosDecision.Tipo.APROBAR,
                                        " \u00a0Aprobación ficticia\u0085",
                                        null)
                                .comentario())
                .isEqualTo("Aprobación ficticia");
    }

    @Test
    void limitesPorPuntosDeCodigoSinUtf16Incompleto() {
        assertThat(
                        new DatosDecision(DatosDecision.Tipo.APROBAR, "😀".repeat(500), null)
                                .comentario())
                .hasSize(1000);
        assertThat(new DatosDecision(DatosDecision.Tipo.RECHAZAR, null, "😀".repeat(1000)).motivo())
                .hasSize(2000);
        for (String texto : List.of("😀".repeat(501), "abc\ud800", "abc\udc00", "ab\0c"))
            assertThatThrownBy(() -> new DatosDecision(DatosDecision.Tipo.APROBAR, texto, null))
                    .isInstanceOf(ErrorSolicitud.class);
        for (String texto : Arrays.asList(null, "", "123456789", "a".repeat(1001)))
            assertThatThrownBy(() -> new DatosDecision(DatosDecision.Tipo.RECHAZAR, null, texto))
                    .isInstanceOf(ErrorSolicitud.class);
        assertThat(new DatosDecision(DatosDecision.Tipo.RECHAZAR, null, " 1234567890 ").motivo())
                .isEqualTo("1234567890");
    }

    @Test
    void tiposNoPermitenCamposDeLaOtraDecision() {
        assertThatThrownBy(() -> new DatosDecision(null, null, null))
                .isInstanceOf(ErrorSolicitud.class);
        assertThatThrownBy(
                        () ->
                                new DatosDecision(
                                        DatosDecision.Tipo.APROBAR, null, "Motivo ficticio"))
                .isInstanceOf(ErrorSolicitud.class);
        assertThatThrownBy(
                        () ->
                                new DatosDecision(
                                        DatosDecision.Tipo.RECHAZAR,
                                        "Comentario",
                                        "Motivo ficticio"))
                .isInstanceOf(ErrorSolicitud.class);
    }

    @Test
    void huellaNormalizadaInequivoca() {
        assertThat(new DatosDecision(DatosDecision.Tipo.APROBAR, null, null).textoParaHuella())
                .isEqualTo("N");
        assertThat(new DatosDecision(DatosDecision.Tipo.APROBAR, "N", null).textoParaHuella())
                .isEqualTo("S1:N");
        assertThat(new DatosDecision(DatosDecision.Tipo.APROBAR, " A:1 ", null).textoParaHuella())
                .isEqualTo("S3:A:1");
        assertThat(new DatosDecision(DatosDecision.Tipo.APROBAR, "", null).textoParaHuella())
                .isEqualTo(
                        new DatosDecision(DatosDecision.Tipo.APROBAR, null, null)
                                .textoParaHuella());
    }

    @Test
    void entradaJsonCerradaVersionYTipos() {
        for (String entrada :
                List.of(
                        "null",
                        "[]",
                        "{}",
                        "{\"version\":-1}",
                        "{\"version\":\"1\"}",
                        "{\"version\":1.0}",
                        "{\"version\":1,\"comentario\":false}",
                        "{\"version\":1,\"motivo\":\"Texto ajeno\"}",
                        "{\"version\":1,\"actor\":\"falso\"}"))
            assertThatThrownBy(
                            () ->
                                    EntradaDecision.leer(
                                            json.readTree(entrada), DatosDecision.Tipo.APROBAR))
                    .isInstanceOf(ErrorSolicitud.class);
        assertThat(
                        EntradaDecision.leer(
                                        json.readTree("{\"version\":1}"),
                                        DatosDecision.Tipo.APROBAR)
                                .comentario())
                .isNull();
        for (String entrada :
                List.of(
                        "{\"version\":1}",
                        "{\"version\":1,\"motivo\":null}",
                        "{\"version\":1,\"motivo\":17}",
                        "{\"version\":1,\"motivo\":\"Motivo válido\",\"comentario\":null}"))
            assertThatThrownBy(
                            () ->
                                    EntradaDecision.leer(
                                            json.readTree(entrada), DatosDecision.Tipo.RECHAZAR))
                    .isInstanceOf(ErrorSolicitud.class);
    }

    @Test
    void soloPresentadaVersionVigenteEstadoAntesQueVersion() {
        UUID autor = UUID.randomUUID(), supervisor = UUID.randomUUID();
        assertThatCode(() -> solicitud(autor, supervisor, "PRESENTADA").exigirDecidible(2))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> solicitud(autor, supervisor, "PRESENTADA").exigirDecidible(1))
                .hasMessage("VERSION_OBSOLETA");
        for (String estado : List.of("BORRADOR", "APROBADA", "RECHAZADA"))
            assertThatThrownBy(() -> solicitud(autor, supervisor, estado).exigirDecidible(1))
                    .hasMessage("SOLICITUD_NO_DECIDIBLE");
    }

    @Test
    void autorNiAdministradorNiSupervisorAjenoDeciden() {
        UUID autor = UUID.randomUUID(), supervisor = UUID.randomUUID();
        var s = solicitud(autor, supervisor, "PRESENTADA");
        assertThatCode(
                        () ->
                                new ActorSolicitud(supervisor, Set.of(Rol.SUPERVISOR))
                                        .exigirDecision(s))
                .doesNotThrowAnyException();
        assertThatThrownBy(
                        () ->
                                new ActorSolicitud(supervisor, Set.of(Rol.ADMINISTRADOR))
                                        .exigirDecision(s))
                .hasMessage("ACCESO_NO_PERMITIDO");
        assertThatThrownBy(
                        () ->
                                new ActorSolicitud(
                                                UUID.randomUUID(),
                                                Set.of(Rol.SUPERVISOR, Rol.ADMINISTRADOR))
                                        .exigirDecision(s))
                .hasMessage("ACCESO_NO_PERMITIDO");
        assertThatThrownBy(
                        () ->
                                new ActorSolicitud(
                                                autor,
                                                Set.of(
                                                        Rol.SUPERVISOR,
                                                        Rol.SOLICITANTE,
                                                        Rol.ADMINISTRADOR))
                                        .exigirDecision(solicitud(autor, autor, "PRESENTADA")))
                .hasMessage("ACCESO_NO_PERMITIDO");
    }

    @Test
    void supervisorLeeFinalesAsignadasYUnionNoBorradoresAjenos() {
        UUID autor = UUID.randomUUID(), supervisor = UUID.randomUUID();
        var actor = new ActorSolicitud(supervisor, Set.of(Rol.SUPERVISOR));
        for (String estado : List.of("PRESENTADA", "APROBADA", "RECHAZADA"))
            assertThat(actor.visible(solicitud(autor, supervisor, estado))).isTrue();
        assertThat(actor.visible(solicitud(autor, supervisor, "BORRADOR"))).isFalse();
        assertThat(actor.visible(solicitud(autor, UUID.randomUUID(), "APROBADA"))).isFalse();
    }

    private static Solicitud solicitud(UUID autor, UUID supervisor, String estado) {
        return new Solicitud(
                UUID.randomUUID(),
                "SOL-2026-000001",
                new Solicitud.Persona(autor, "Autor"),
                "Asunto",
                null,
                null,
                null,
                supervisor,
                new Solicitud.Persona(supervisor, "Supervisor"),
                "EUR",
                estado,
                new BigDecimal("10.00"),
                2,
                Instant.EPOCH,
                Instant.EPOCH,
                Instant.EPOCH,
                List.of(),
                null);
    }
}
