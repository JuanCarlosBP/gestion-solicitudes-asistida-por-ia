package es.gestionsolicitudes.salud.http;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import es.gestionsolicitudes.configuracion.ErroresControlados;
import es.gestionsolicitudes.configuracion.SeguridadTecnica;
import es.gestionsolicitudes.salud.aplicacion.EstadoSalud;
import es.gestionsolicitudes.salud.aplicacion.ServicioSalud;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ControladorSalud.class)
@Import({SeguridadTecnica.class, ErroresControlados.class})
class ControladorSaludTest {
    @Autowired MockMvc http;
    @MockitoBean ServicioSalud servicio;

    @Test
    void devuelve200ConElContratoMinimo() throws Exception {
        when(servicio.comprobar()).thenReturn(EstadoSalud.DISPONIBLE);
        http.perform(get("/api/salud"))
                .andExpect(status().isOk())
                .andExpect(content().json("{\"estado\":\"DISPONIBLE\"}"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    @Test
    void devuelve503SinInformacionInterna() throws Exception {
        when(servicio.comprobar()).thenReturn(EstadoSalud.NO_DISPONIBLE);
        http.perform(get("/api/salud"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().string("{\"estado\":\"NO_DISPONIBLE\"}"));
    }

    @Test
    void controlaUnFalloInesperado() throws Exception {
        when(servicio.comprobar()).thenThrow(new IllegalStateException("detalle privado ficticio"));
        http.perform(get("/api/salud"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string("{\"error\":\"ERROR_INTERNO\"}"));
    }

    @Test
    void deniegaOperacionesYRutasNoPublicas() throws Exception {
        for (var ruta : new String[] {"/actuator", "/actuator/env", "/api/proveedores", "/login"}) {
            http.perform(get(ruta))
                    .andExpect(status().isForbidden())
                    .andExpect(content().string("{\"error\":\"ACCESO_NO_PERMITIDO\"}"));
        }
        http.perform(post("/api/salud")).andExpect(status().isForbidden());
    }

    @Test
    void noAbreCorsAUnOrigenAjeno() throws Exception {
        http.perform(
                        options("/api/salud")
                                .header("Origin", "https://ajeno.invalid")
                                .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}
