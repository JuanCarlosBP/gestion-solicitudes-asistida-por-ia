package es.gestionsolicitudes.proveedores.dominio;

import static org.assertj.core.api.Assertions.*;

import es.gestionsolicitudes.identidad.dominio.Rol;
import es.gestionsolicitudes.proveedores.http.EntradaProveedor;
import es.gestionsolicitudes.proveedores.http.FiltrosProveedores;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.util.LinkedMultiValueMap;
import tools.jackson.databind.json.JsonMapper;

class ProveedorDominioTest {
    @Test
    void normalizaNfkcRootEspaciosUnicodeYPuntuacionSinFusionarla() {
        assertThat(DatosProveedor.normalizarFiscal("\u0085ａｂ\u00a0\u0085\u2003ß-1\u3000"))
                .isEqualTo("AB SS-1");
        assertThat(DatosProveedor.normalizarFiscal("ab-123"))
                .isNotEqualTo(DatosProveedor.normalizarFiscal("ab123"));
        Locale anterior = Locale.getDefault();
        try {
            Locale.setDefault(Locale.forLanguageTag("tr-TR"));
            assertThat(DatosProveedor.normalizarFiscal("i-123")).isEqualTo("I-123");
        } finally {
            Locale.setDefault(anterior);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "  ", "AB", "ＡＢ", "\u0000ABC", "\ud800ABC"})
    void fiscalInvalidoNoSeAcepta(String fiscal) {
        assertThatThrownBy(() -> DatosProveedor.normalizarFiscal(fiscal))
                .isInstanceOf(ErrorProveedor.class);
    }

    @Test
    void expansionUnicodeSeValidaDespuesDeNormalizarYLongitudesSonPuntosUnicode() {
        assertThat(DatosProveedor.normalizarFiscal("ß".repeat(32))).hasSize(64);
        assertThatThrownBy(() -> DatosProveedor.normalizarFiscal("ß".repeat(33)))
                .isInstanceOf(ErrorProveedor.class);
        assertThat(datos("😀".repeat(160), "ES", "ABC", null, null).denominacion())
                .isEqualTo("😀".repeat(160));
        assertThatThrownBy(() -> datos("😀".repeat(161), "ES", "ABC", null, null))
                .isInstanceOf(ErrorProveedor.class);
        assertThat(
                        datos(" \u0085 Acme  Ficticia \u00a0", "FR", "123", null, "x".repeat(32))
                                .denominacion())
                .isEqualTo("Acme  Ficticia");
    }

    @ParameterizedTest
    @ValueSource(strings = {"es", "ZZ", "ESP", " ES", ""})
    void paisDebeSerIsoMayusculo(String pais) {
        assertThatThrownBy(() -> datos("Acme", pais, "ABC", null, null))
                .isInstanceOf(ErrorProveedor.class);
    }

    @Test
    void contactosOpcionalesYLímitesSeValidan() {
        assertThat(datos("Acme", "US", "ABC", null, null).correoContacto()).isNull();
        assertThat(
                        datos("Acme", "DE", "ABC", "contacto@ejemplo.invalid", "+49 (0) ficticio")
                                .correoContacto())
                .isEqualTo("contacto@ejemplo.invalid");
        for (String correo :
                new String[] {
                    "invalido",
                    "a@@ejemplo.invalid",
                    "a\r\n@ejemplo.invalid",
                    "a".repeat(240) + "@ejemplo.invalid"
                })
            assertThatThrownBy(() -> datos("Acme", "ES", "ABC", correo, null))
                    .isInstanceOf(ErrorProveedor.class);
        assertThatThrownBy(() -> datos("Acme", "ES", "ABC", null, "x".repeat(33)))
                .isInstanceOf(ErrorProveedor.class);
        assertThatThrownBy(() -> datos("  ", "ES", "ABC", null, null))
                .isInstanceOf(ErrorProveedor.class);
    }

    @Test
    void matrizYUnionDeRolesSonExplicitas() {
        for (Rol rol : Rol.values()) {
            var actor = new ActorProveedor(UUID.randomUUID(), Set.of(rol));
            assertThatCode(actor::exigirLectura).doesNotThrowAnyException();
            assertThat(actor.puedeVerInactivos())
                    .isEqualTo(rol == Rol.AUDITOR || rol == Rol.ADMINISTRADOR);
            if (rol == Rol.ADMINISTRADOR)
                assertThatCode(actor::exigirEscritura).doesNotThrowAnyException();
            else assertThatThrownBy(actor::exigirEscritura).isInstanceOf(ErrorProveedor.class);
        }
        var union = new ActorProveedor(UUID.randomUUID(), Set.of(Rol.SOLICITANTE, Rol.AUDITOR));
        assertThat(union.puedeVerInactivos()).isTrue();
        assertThatThrownBy(union::exigirEscritura).isInstanceOf(ErrorProveedor.class);
        assertThatCode(
                        new ActorProveedor(
                                        UUID.randomUUID(),
                                        Set.of(Rol.SUPERVISOR, Rol.ADMINISTRADOR))
                                ::exigirEscritura)
                .doesNotThrowAnyException();
        assertThatThrownBy(new ActorProveedor(UUID.randomUUID(), Set.of())::exigirLectura)
                .isInstanceOf(ErrorProveedor.class);
    }

    @Test
    void versionObsoletaSeCompruebaTambienSiElEstadoCoincide() {
        var proveedor =
                new Proveedor(
                        UUID.randomUUID(),
                        datos("Acme", "ES", "ABC", null, null),
                        false,
                        3,
                        Instant.EPOCH,
                        Instant.EPOCH);
        assertThatCode(() -> proveedor.exigirVersion(3)).doesNotThrowAnyException();
        assertThatThrownBy(() -> proveedor.exigirVersion(2))
                .isInstanceOf(ErrorProveedor.class)
                .hasMessage("VERSION_OBSOLETA");
        assertThatThrownBy(() -> proveedor.exigirVersion(-1))
                .isInstanceOf(ErrorProveedor.class)
                .hasMessage("SOLICITUD_INVALIDA");
    }

    @ParameterizedTest
    @ValueSource(strings = {"1.0", "1.9", "\"1\"", "true", "-1", "9223372036854775808", "null"})
    void versionHttpNoSeCoacciona(String version) {
        var nodo = JsonMapper.builder().build().readTree("{\"version\":" + version + "}");
        assertThatThrownBy(() -> EntradaProveedor.version(nodo, true))
                .isInstanceOf(ErrorProveedor.class);
    }

    @Test
    void filtrosRechazanParametrosInternosRepetidosYTamanosInvalidos() {
        var parametros = new LinkedMultiValueMap<String, String>();
        assertThat(FiltrosProveedores.leer(parametros).tamano()).isEqualTo(20);
        for (String campo : new String[] {"version", "rol", "identificadorFiscalNormalizado"}) {
            parametros.clear();
            parametros.add(campo, "0");
            assertThatThrownBy(() -> FiltrosProveedores.leer(parametros))
                    .isInstanceOf(ErrorProveedor.class);
        }
        parametros.clear();
        parametros.add("page", "0");
        parametros.add("page", "1");
        assertThatThrownBy(() -> FiltrosProveedores.leer(parametros))
                .isInstanceOf(ErrorProveedor.class);
        parametros.clear();
        parametros.add("size", "101");
        assertThatThrownBy(() -> FiltrosProveedores.leer(parametros))
                .isInstanceOf(ErrorProveedor.class);
    }

    private static DatosProveedor datos(
            String nombre, String pais, String fiscal, String correo, String telefono) {
        return new DatosProveedor(
                TipoProveedor.PERSONA_JURIDICA, nombre, pais, fiscal, correo, telefono);
    }
}
