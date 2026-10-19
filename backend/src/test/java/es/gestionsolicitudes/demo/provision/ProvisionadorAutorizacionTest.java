package es.gestionsolicitudes.demo.provision;

import static org.assertj.core.api.Assertions.*;

import es.gestionsolicitudes.demo.configuracion.PropiedadesDemo;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

/** Verifica el constructor real, no solo la función de autorización aislada. No abre bases. */
class ProvisionadorAutorizacionTest {
    @TempDir Path temporal;

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t", "true", "RECREAR_SOLO_BASES_DEMO_FICTICIAS "})
    void publicoSinConfirmacionExactaConservaElRechazo(String confirmacion) throws Exception {
        var p = configuracion("publico");
        if (confirmacion != null) p.setProperty("provision.autorizacion", confirmacion);
        assertThatThrownBy(() -> new ProvisionadorDemo(new PropiedadesDemo(p)))
                .isExactlyInstanceOf(IllegalStateException.class)
                .hasMessage("Provisión no autorizada para este entorno");
    }

    @Test
    void publicoConfirmadoPermiteConstruirPeroNoEjecutaProvision() throws Exception {
        var p = configuracion("publico");
        p.setProperty("provision.autorizacion", AutorizacionProvision.CONFIRMACION);
        assertThatCode(() -> new ProvisionadorDemo(new PropiedadesDemo(p)))
                .doesNotThrowAnyException();
    }

    @Test
    void localSigueSinExigirConfirmacionPublica() throws Exception {
        var p = configuracion("local");
        assertThatCode(() -> new ProvisionadorDemo(new PropiedadesDemo(p)))
                .doesNotThrowAnyException();
    }

    @ParameterizedTest
    @ValueSource(strings = {"PUBLICO", "publico ", "produccion", "otro"})
    void otroEntornoSeRechazaAunqueTengaConfirmacion(String entorno) throws Exception {
        var p = configuracion(entorno);
        p.setProperty("provision.autorizacion", AutorizacionProvision.CONFIRMACION);
        assertThatThrownBy(() -> new ProvisionadorDemo(new PropiedadesDemo(p)))
                .isExactlyInstanceOf(IllegalStateException.class)
                .hasMessage("Provisión no autorizada para este entorno");
    }

    @Test
    void publicoConfirmadoNoPermiteCambiarServidor() throws Exception {
        var p = configuracion("publico");
        p.setProperty("provision.autorizacion", AutorizacionProvision.CONFIRMACION);
        p.setProperty("admin.url", "jdbc:postgresql://otro:5432/postgres");
        assertThatThrownBy(() -> new ProvisionadorDemo(new PropiedadesDemo(p)))
                .isExactlyInstanceOf(IllegalStateException.class)
                .hasMessage("Inventario fuera del laboratorio");
    }

    @Test
    void publicoConfirmadoNoPermiteOtraIdentidadMigradora() throws Exception {
        var p = configuracion("publico");
        p.setProperty("provision.autorizacion", AutorizacionProvision.CONFIRMACION);
        p.setProperty("migracion.usuario", "otro_usuario");
        assertThatThrownBy(() -> new ProvisionadorDemo(new PropiedadesDemo(p)))
                .isExactlyInstanceOf(IllegalStateException.class)
                .hasMessage("Identidad de provisión inválida");
    }

    @Test
    void confirmacionNoPermiteCredencialesAdministrativasEnHttp() throws Exception {
        var p = configuracion("publico");
        p.setProperty("provision.autorizacion", AutorizacionProvision.CONFIRMACION);
        assertThatThrownBy(() -> new PropiedadesDemo(p).exigirConfiguracionRuntime())
                .isExactlyInstanceOf(IllegalStateException.class)
                .hasMessage("El servidor HTTP no admite credenciales de provisión");
    }

    private Properties configuracion(String entorno) throws Exception {
        Path semilla = temporal.resolve("semilla-ficticia.txt");
        Files.writeString(semilla, Base64.getEncoder().encodeToString(new byte[32]));
        var p = new Properties();
        p.setProperty("entorno", entorno);
        p.setProperty("espacios", "ag016_demo_01");
        p.setProperty("cupo", "1");
        p.setProperty("semilla.ruta", semilla.toString());
        p.setProperty("control.url", "jdbc:postgresql://localhost:5432/ag016_control");
        p.setProperty("control.usuario", "ag016_control_app");
        p.setProperty("control.clave", "ficticia-test");
        p.setProperty(
                "espacio.ag016_demo_01.url", "jdbc:postgresql://localhost:5432/ag016_demo_01");
        p.setProperty("espacio.ag016_demo_01.usuario", "ag016_app_01");
        p.setProperty("espacio.ag016_demo_01.clave", "ficticia-test");
        p.setProperty("admin.url", "jdbc:postgresql://localhost:5432/postgres");
        p.setProperty("admin.usuario", "ag016_provision");
        p.setProperty("admin.clave", "ficticia-test");
        p.setProperty("migracion.usuario", "gestion_migracion");
        p.setProperty("migracion.clave", "ficticia-test");
        return p;
    }
}
