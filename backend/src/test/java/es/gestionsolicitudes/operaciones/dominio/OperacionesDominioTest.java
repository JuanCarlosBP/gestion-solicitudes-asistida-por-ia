package es.gestionsolicitudes.operaciones.dominio;

import static org.assertj.core.api.Assertions.*;

import es.gestionsolicitudes.configuracion.ErroresControlados;
import es.gestionsolicitudes.proveedores.dominio.*;
import es.gestionsolicitudes.solicitudes.dominio.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.junit.jupiter.api.Test;

class OperacionesDominioTest {
    private final UUID usuario = UUID.fromString("12345678-1234-1234-1234-123456789abc");
    private final UUID clave = UUID.fromString("87654321-4321-4321-4321-cba987654321");

    @Test
    void serializacionCanonicaUsaLongitudUtf8NulidadYOrdenAprobados() throws Exception {
        String esperado =
                "CI2;S14:CREAR_BORRADOR;S36:12345678-1234-1234-1234-123456789abc;N;N;S10:Árbol😀;";
        assertThat(
                        PeticionOperacion.de(
                                        TipoOperacion.CREAR_BORRADOR,
                                        usuario,
                                        clave,
                                        null,
                                        null,
                                        "Árbol😀")
                                .huella())
                .isEqualTo(
                        HexFormat.of()
                                .formatHex(
                                        MessageDigest.getInstance("SHA-256")
                                                .digest(
                                                        esperado.getBytes(
                                                                StandardCharsets.UTF_8))));
    }

    @Test
    void nullVacioSeparadoresYDistintaIdentidadNuncaSeConfunden() {
        var base =
                PeticionOperacion.de(
                        TipoOperacion.APROBAR, usuario, clave, clave, 1L, (String) null);
        assertThat(base.huella())
                .isNotEqualTo(
                        PeticionOperacion.de(TipoOperacion.APROBAR, usuario, clave, clave, 1L, "")
                                .huella());
        assertThat(base.huella())
                .isNotEqualTo(
                        PeticionOperacion.de(
                                        TipoOperacion.APROBAR,
                                        clave,
                                        clave,
                                        clave,
                                        1L,
                                        (String) null)
                                .huella());
        assertThat(base.huella())
                .isNotEqualTo(
                        PeticionOperacion.de(
                                        TipoOperacion.APROBAR,
                                        usuario,
                                        clave,
                                        usuario,
                                        1L,
                                        (String) null)
                                .huella());
        assertThat(base.huella())
                .isNotEqualTo(
                        PeticionOperacion.de(
                                        TipoOperacion.APROBAR,
                                        usuario,
                                        clave,
                                        clave,
                                        2L,
                                        (String) null)
                                .huella());
        assertThat(
                        HuellaOperacion.canonica(
                                TipoOperacion.CREAR_PROVEEDOR,
                                usuario,
                                null,
                                null,
                                List.of("a;S1:b", "c")))
                .isNotEqualTo(
                        HuellaOperacion.canonica(
                                TipoOperacion.CREAR_PROVEEDOR,
                                usuario,
                                null,
                                null,
                                List.of("a", "b;S1:c")));
    }

    @Test
    void mismaEntradaNormalizadaMismaHuellaFiscalAsuntoYComentario() {
        var uno =
                new DatosProveedor(
                        TipoProveedor.PROFESIONAL, "  Ejemplo  ", "ES", "ＡＢ １２３", null, null);
        var dos =
                new DatosProveedor(
                        TipoProveedor.PROFESIONAL, "Ejemplo", "ES", "ab 123", null, null);
        assertThat(proveedor(uno).huella()).isEqualTo(proveedor(dos).huella());
        var diferente =
                new DatosProveedor(
                        TipoProveedor.PROFESIONAL, "Ejemplo", "ES", "AB-123", null, null);
        assertThat(proveedor(uno).huella()).isNotEqualTo(proveedor(diferente).huella());
        assertThat(DatosBorrador.texto("\u0085 Asunto\u00a0", 3, 160)).isEqualTo("Asunto");
        var comentario = new DatosDecision(DatosDecision.Tipo.APROBAR, "\u0085 \u00a0", null);
        assertThat(
                        PeticionOperacion.de(
                                        TipoOperacion.APROBAR,
                                        usuario,
                                        clave,
                                        clave,
                                        1L,
                                        comentario.comentario())
                                .huella())
                .isEqualTo(
                        PeticionOperacion.de(
                                        TipoOperacion.APROBAR,
                                        usuario,
                                        clave,
                                        clave,
                                        1L,
                                        (String) null)
                                .huella());
    }

    @Test
    void cambiosContactoYEspaciosInterioresSonSignificativos() {
        var uno =
                new DatosProveedor(
                        TipoProveedor.PROFESIONAL, "Ejemplo uno", "ES", "ABC", null, "123");
        var dos =
                new DatosProveedor(
                        TipoProveedor.PROFESIONAL, "Ejemplo  uno", "ES", "ABC", null, "123");
        var tres =
                new DatosProveedor(
                        TipoProveedor.PROFESIONAL, "Ejemplo uno", "ES", "ABC", null, "124");
        assertThat(proveedor(uno).huella())
                .isNotEqualTo(proveedor(dos).huella())
                .isNotEqualTo(proveedor(tres).huella());
    }

    @Test
    void claveNoFormaParteHuellaPeroOperacionSi() {
        var uno =
                PeticionOperacion.de(
                        TipoOperacion.DESACTIVAR_PROVEEDOR, usuario, clave, usuario, 1L);
        assertThat(uno.huella())
                .isEqualTo(
                        PeticionOperacion.de(
                                        TipoOperacion.DESACTIVAR_PROVEEDOR,
                                        usuario,
                                        usuario,
                                        usuario,
                                        1L)
                                .huella());
        assertThat(uno.huella())
                .isNotEqualTo(
                        PeticionOperacion.de(
                                        TipoOperacion.REACTIVAR_PROVEEDOR,
                                        usuario,
                                        clave,
                                        usuario,
                                        1L)
                                .huella());
        assertThat(uno.huella()).matches("[0-9a-f]{64}");
    }

    @Test
    void legadoConservaDigestOriginalInclusoLongitudUtf16() {
        assertThat(
                        PeticionOperacion.de(TipoOperacion.PRESENTAR, usuario, clave, clave, 1L)
                                .huellaLegada())
                .isEqualTo(HuellaOperacion.hash("PRESENTAR:" + clave + ":1"));
        assertThat(
                        PeticionOperacion.de(TipoOperacion.APROBAR, usuario, clave, clave, 1L, "😀")
                                .huellaLegada())
                .isEqualTo(HuellaOperacion.hash("APROBAR:" + clave + ":1:S2:😀"));
    }

    @Test
    void uuidCanonicoRechazaAusentesCortosEspaciosYTexto() {
        assertThat(HuellaOperacion.uuid(clave.toString().toUpperCase(Locale.ROOT)))
                .isEqualTo(clave);
        for (String invalido :
                Arrays.asList(null, "", "1-1-1-1-1", " " + clave, clave + " ", "no-uuid"))
            assertThatThrownBy(() -> HuellaOperacion.uuid(invalido))
                    .isInstanceOf(ErrorOperacion.class)
                    .hasMessage("SOLICITUD_INVALIDA");
    }

    @Test
    void peticionExigeClaveRecursoYVersionEsperada() {
        assertThatThrownBy(
                        () ->
                                PeticionOperacion.de(
                                        TipoOperacion.PRESENTAR, usuario, null, clave, 1L))
                .hasMessage("SOLICITUD_INVALIDA");
        assertThatThrownBy(
                        () ->
                                PeticionOperacion.de(
                                        TipoOperacion.PRESENTAR, usuario, clave, null, 1L))
                .hasMessage("SOLICITUD_INVALIDA");
        assertThatThrownBy(
                        () ->
                                PeticionOperacion.de(
                                        TipoOperacion.PRESENTAR, usuario, clave, clave, -1L))
                .hasMessage("SOLICITUD_INVALIDA");
        assertThatThrownBy(
                        () ->
                                PeticionOperacion.de(
                                        TipoOperacion.CREAR_BORRADOR,
                                        usuario,
                                        clave,
                                        clave,
                                        null,
                                        "Asunto"))
                .hasMessage("SOLICITUD_INVALIDA");
    }

    @Test
    void erroresEstablesYRetryAfterExclusivoDeProgreso() {
        var manejador = new ErroresControlados();
        for (var codigo : ErrorOperacion.Codigo.values()) {
            var respuesta = manejador.tratarOperacion(new ErrorOperacion(codigo));
            assertThat(respuesta.getBody().error()).isEqualTo(codigo.name());
            assertThat(respuesta.getHeaders().getFirst("Retry-After"))
                    .isEqualTo(codigo == ErrorOperacion.Codigo.OPERACION_EN_PROGRESO ? "1" : null);
            assertThat(respuesta.getStatusCode().value())
                    .isEqualTo(
                            switch (codigo) {
                                case SOLICITUD_INVALIDA -> 400;
                                case ACCESO_NO_PERMITIDO -> 403;
                                case OPERACION_NO_ENCONTRADA -> 404;
                                default -> 409;
                            });
        }
    }

    private PeticionOperacion proveedor(DatosProveedor d) {
        return PeticionOperacion.de(
                TipoOperacion.CREAR_PROVEEDOR,
                usuario,
                clave,
                null,
                null,
                d.tipo().name(),
                d.denominacion(),
                d.paisFiscal(),
                d.fiscalNormalizado(),
                d.correoContacto(),
                d.telefonoContacto());
    }
}
