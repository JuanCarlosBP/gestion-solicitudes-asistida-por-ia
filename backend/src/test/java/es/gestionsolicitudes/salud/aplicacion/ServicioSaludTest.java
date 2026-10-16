package es.gestionsolicitudes.salud.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ServicioSaludTest {
    @Test
    void informaDisponibilidadSoloSiLaDependenciaResponde() {
        assertThat(new ServicioSalud(() -> true).comprobar()).isEqualTo(EstadoSalud.DISPONIBLE);
    }

    @Test
    void informaFalloDeDependenciaSinDetallesInternos() {
        assertThat(new ServicioSalud(() -> false).comprobar()).isEqualTo(EstadoSalud.NO_DISPONIBLE);
    }
}
