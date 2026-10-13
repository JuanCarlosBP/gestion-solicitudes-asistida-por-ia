package es.gestionsolicitudes.salud.persistencia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class ComprobacionPostgresTest {
    @Test
    void limitaLaConsultaYLiberaLosRecursos() throws SQLException {
        var origen = mock(DataSource.class);
        var conexion = mock(Connection.class);
        var consulta = mock(PreparedStatement.class);
        var resultado = mock(ResultSet.class);
        when(origen.getConnection()).thenReturn(conexion);
        when(conexion.prepareStatement("SELECT 1")).thenReturn(consulta);
        when(consulta.executeQuery()).thenReturn(resultado);
        when(resultado.next()).thenReturn(true);
        when(resultado.getInt(1)).thenReturn(1);
        assertThat(new ComprobacionPostgres(origen).disponible()).isTrue();
        verify(consulta).setQueryTimeout(2);
        verify(resultado).close();
        verify(consulta).close();
        verify(conexion).close();
    }

    @Test
    void traduceErrorDeConexionSinPropagarSuMensaje() throws SQLException {
        var origen = mock(DataSource.class);
        when(origen.getConnection()).thenThrow(new SQLException("detalle privado ficticio"));
        assertThat(new ComprobacionPostgres(origen).disponible()).isFalse();
    }

    @Test
    void rechazaConsultaFallidaYLiberaConexion() throws SQLException {
        var origen = mock(DataSource.class);
        var conexion = mock(Connection.class);
        var consulta = mock(PreparedStatement.class);
        when(origen.getConnection()).thenReturn(conexion);
        when(conexion.prepareStatement("SELECT 1")).thenReturn(consulta);
        when(consulta.executeQuery()).thenThrow(new SQLException("consulta cancelada"));
        assertThat(new ComprobacionPostgres(origen).disponible()).isFalse();
        verify(consulta).close();
        verify(conexion).close();
    }
}
