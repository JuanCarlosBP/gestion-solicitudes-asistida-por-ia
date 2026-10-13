package es.gestionsolicitudes.salud.http;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import es.gestionsolicitudes.configuracion.ErroresControlados;
import es.gestionsolicitudes.configuracion.SeguridadTecnica;
import es.gestionsolicitudes.identidad.http.CookiesIdentidad;
import es.gestionsolicitudes.salud.aplicacion.EstadoSalud;
import es.gestionsolicitudes.salud.aplicacion.ServicioSalud;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ControladorSalud.class)
@Import({SeguridadTecnica.class, ErroresControlados.class})
class ControladorSaludTest {
    @Autowired MockMvc http;
    @MockitoBean ServicioSalud servicio;
    @MockitoBean JwtDecoder decodificador;
    @MockitoBean CookiesIdentidad cookies;

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
                    .andExpect(status().isUnauthorized())
                    .andExpect(content().string("{\"error\":\"NO_AUTENTICADO\"}"));
        }
        http.perform(post("/api/salud")).andExpect(status().isForbidden());
    }

    @Test
    void noAbreCorsAUnOrigenAjeno() throws Exception {
        http.perform(
                        options("/api/salud")
                                .header("Origin", "https://ajeno.invalid")
                                .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}
