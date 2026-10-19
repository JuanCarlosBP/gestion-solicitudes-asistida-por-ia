package es.gestionsolicitudes.demo.provision;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import es.gestionsolicitudes.demo.configuracion.PropiedadesDemo;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Base64;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;

class SupervisionDemoTest {
    @TempDir Path temporal;

    @AfterEach
    void limpiarInterrupcion() {
        Thread.interrupted();
    }

    @Test
    void sinTrabajoNoEjecutaLoteYConservaEsperaDeDosSegundos() {
        var lotes = new AtomicInteger();
        var sondeos = new AtomicInteger();
        var esperas = new AtomicInteger();
        ProvisionadorDemo.supervisar(
                () -> {
                    sondeos.incrementAndGet();
                    return false;
                },
                lotes::incrementAndGet,
                milisegundos -> {
                    assertThat(milisegundos).isEqualTo(2000);
                    if (esperas.incrementAndGet() == 2) throw new InterruptedException();
                });
        assertThat(lotes.get()).isZero();
        assertThat(sondeos.get()).isEqualTo(2);
        assertThat(Thread.currentThread().isInterrupted()).isTrue();
    }

    @Test
    void ejecutaSoloCuandoElSondeoEncuentraTrabajo() {
        var lotes = new AtomicInteger();
        var sondeos = new AtomicInteger();
        var esperas = new AtomicInteger();
        ProvisionadorDemo.supervisar(
                () -> sondeos.incrementAndGet() == 2,
                lotes::incrementAndGet,
                milisegundos -> {
                    if (esperas.incrementAndGet() == 3) throw new InterruptedException();
                });
        assertThat(lotes.get()).isEqualTo(1);
        assertThat(sondeos.get()).isEqualTo(3);
    }

    @Test
    void caidaDelControlEsperaAntesDeIntentarElSiguienteCiclo() {
        var lotes = new AtomicInteger();
        var sondeos = new AtomicInteger();
        var esperas = new AtomicInteger();
        ProvisionadorDemo.supervisar(
                () -> {
                    if (sondeos.incrementAndGet() == 1) throw new IllegalStateException();
                    assertThat(esperas.get()).isEqualTo(1);
                    return true;
                },
                lotes::incrementAndGet,
                milisegundos -> {
                    assertThat(milisegundos).isEqualTo(2000);
                    if (esperas.incrementAndGet() == 2) throw new InterruptedException();
                });
        assertThat(lotes.get()).isEqualTo(1);
    }

    @Test
    void falloDeUnLoteNoImpideElSiguienteNiProvocaBucleRapido() {
        var lotes = new AtomicInteger();
        var esperas = new AtomicInteger();
        ProvisionadorDemo.supervisar(
                () -> true,
                () -> {
                    if (lotes.incrementAndGet() == 1) throw new IllegalStateException();
                    assertThat(esperas.get()).isEqualTo(1);
                },
                milisegundos -> {
                    assertThat(milisegundos).isEqualTo(2000);
                    if (esperas.incrementAndGet() == 2) throw new InterruptedException();
                });
        assertThat(lotes.get()).isEqualTo(2);
    }

    @Test
    void hiloYaInterrumpidoNoAbreOtroCiclo() {
        Thread.currentThread().interrupt();
        ProvisionadorDemo.supervisar(
                () -> {
                    throw new AssertionError("No debe sondear");
                },
                () -> {
                    throw new AssertionError("No debe ejecutar lote");
                },
                milisegundos -> {
                    throw new AssertionError("No debe esperar");
                });
        assertThat(Thread.currentThread().isInterrupted()).isTrue();
    }

    @Test
    void supervisorNoHaceBootstrapDeUnEspacioAusente() throws Exception {
        var control = mock(JdbcTemplate.class);
        when(control.queryForList(anyString(), eq(String.class), eq("ag016_demo_01")))
                .thenReturn(List.of());
        provisionador().preparar(control, "ag016_demo_01", false);
        verify(control)
                .queryForList(
                        "SELECT estado FROM demo.espacios WHERE id=?",
                        String.class,
                        "ag016_demo_01");
        verifyNoMoreInteractions(control);
    }

    @ParameterizedTest
    @ValueSource(strings = {"BLOQUEADO", "LISTO", "RESERVADO", "DRENANDO", "PREPARANDO"})
    void supervisorNoReparaNiRecreaEspaciosNoReciclables(String estado) throws Exception {
        var control = mock(JdbcTemplate.class);
        when(control.queryForList(anyString(), eq(String.class), eq("ag016_demo_01")))
                .thenReturn(List.of(estado));
        provisionador().preparar(control, "ag016_demo_01", false);
        verify(control)
                .queryForList(
                        "SELECT estado FROM demo.espacios WHERE id=?",
                        String.class,
                        "ag016_demo_01");
        verifyNoMoreInteractions(control);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ag016_demo_01", "ag016_demo_99"})
    void sondeoCierraConexionYSoloAdmiteElInventario(String espacio) throws Exception {
        var conexion = mock(Connection.class);
        var consulta = mock(Statement.class);
        var filas = mock(ResultSet.class);
        when(conexion.createStatement()).thenReturn(consulta);
        when(consulta.executeQuery(anyString())).thenReturn(filas);
        when(filas.next()).thenReturn(true, false);
        when(filas.getString(1)).thenReturn(espacio);
        try (var driver = mockStatic(DriverManager.class)) {
            driver.when(() -> DriverManager.getConnection(anyString(), any(Properties.class)))
                    .thenReturn(conexion);
            assertThat(provisionador().hayReciclables()).isEqualTo(espacio.equals("ag016_demo_01"));
        }
        verify(conexion).setReadOnly(true);
        verify(consulta).setQueryTimeout(2);
        verify(consulta)
                .executeQuery(
                        "SELECT id FROM demo.espacios WHERE estado='RECICLABLE' AND reserva_id IS NULL AND cookie_hash IS NULL AND expira_en IS NULL");
        verify(filas).close();
        verify(consulta).close();
        verify(conexion).close();
    }

    @Test
    void sondeoFallidoCierraConexionSinExponerElDiagnosticoSql() throws Exception {
        var conexion = mock(Connection.class);
        var consulta = mock(Statement.class);
        when(conexion.createStatement()).thenReturn(consulta);
        when(consulta.executeQuery(anyString()))
                .thenThrow(new java.sql.SQLException("Detalle privado"));
        try (var driver = mockStatic(DriverManager.class)) {
            driver.when(() -> DriverManager.getConnection(anyString(), any(Properties.class)))
                    .thenReturn(conexion);
            assertThatThrownBy(() -> provisionador().hayReciclables())
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("Sondeo de control no disponible")
                    .hasNoCause();
        }
        verify(consulta).close();
        verify(conexion).close();
    }

    private ProvisionadorDemo provisionador() throws Exception {
        var semilla = temporal.resolve("semilla");
        Files.writeString(semilla, Base64.getEncoder().encodeToString(new byte[32]));
        var p = new Properties();
        p.setProperty("entorno", "local");
        p.setProperty("semilla.ruta", semilla.toString());
        p.setProperty("espacios", "ag016_demo_01");
        p.setProperty("cupo", "1");
        p.setProperty("admin.url", "jdbc:postgresql://localhost:5432/postgres");
        p.setProperty("admin.usuario", "ag016_provision");
        p.setProperty("admin.clave", "ficticia-test");
        p.setProperty("control.url", "jdbc:postgresql://localhost:5432/ag016_control");
        p.setProperty("control.usuario", "ag016_control_app");
        p.setProperty("control.clave", "ficticia-test");
        p.setProperty(
                "espacio.ag016_demo_01.url", "jdbc:postgresql://localhost:5432/ag016_demo_01");
        p.setProperty("espacio.ag016_demo_01.usuario", "ag016_app_01");
        p.setProperty("espacio.ag016_demo_01.clave", "ficticia-test");
        p.setProperty("migracion.usuario", "gestion_migracion");
        p.setProperty("migracion.clave", "ficticia-test");
        return new ProvisionadorDemo(new PropiedadesDemo(p));
    }
}
