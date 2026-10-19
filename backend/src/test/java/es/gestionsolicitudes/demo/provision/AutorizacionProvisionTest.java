package es.gestionsolicitudes.demo.provision;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class AutorizacionProvisionTest {
    @Test
    void conservaLaboratorioSinExigirAutorizacionPublica() {
        assertThatCode(() -> AutorizacionProvision.exigir("local", "")).doesNotThrowAnyException();
    }

    @Test
    void publicoExigeConfirmacionExacta() {
        assertThatCode(
                        () ->
                                AutorizacionProvision.exigir(
                                        "publico", AutorizacionProvision.CONFIRMACION))
                .doesNotThrowAnyException();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"PUBLICO", "produccion", "publico ", "otro"})
    void rechazaEntornoDistintoAunqueHayaConfirmacion(String entorno) {
        assertThatThrownBy(
                        () ->
                                AutorizacionProvision.exigir(
                                        entorno, AutorizacionProvision.CONFIRMACION))
                .isInstanceOf(IllegalStateException.class);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"true", "local", "RECREAR_SOLO_BASES_DEMO_FICTICIAS "})
    void rechazaPublicoSinConfirmacionExacta(String confirmacion) {
        assertThatThrownBy(() -> AutorizacionProvision.exigir("publico", confirmacion))
                .isInstanceOf(IllegalStateException.class);
    }
}
