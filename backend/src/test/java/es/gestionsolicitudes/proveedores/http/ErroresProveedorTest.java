package es.gestionsolicitudes.proveedores.http;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import es.gestionsolicitudes.configuracion.ErroresControlados;
import es.gestionsolicitudes.configuracion.SeguridadTecnica;
import es.gestionsolicitudes.identidad.http.CookiesIdentidad;
import es.gestionsolicitudes.proveedores.aplicacion.ServicioProveedores;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.CannotCreateTransactionException;

@WebMvcTest(ControladorProveedores.class)
@Import({SeguridadTecnica.class, ErroresControlados.class})
class ErroresProveedorTest {
    @Autowired MockMvc http;
    @MockitoBean ServicioProveedores servicio;
    @MockitoBean JwtDecoder decodificador;
    @MockitoBean CookiesIdentidad cookies;

    @Test
    void dependenciaInaccesibleDespuesDeAutenticarDevuelve503SinSql() throws Exception {
        when(servicio.listar(any(), any()))
                .thenThrow(new DataAccessResourceFailureException("SQL y dato privado ficticio"));
        comprobar(503, "DEPENDENCIA_NO_DISPONIBLE");
    }

    @Test
    void falloAlAbrirTransaccionSeControlaSinDetalles() throws Exception {
        when(servicio.listar(any(), any()))
                .thenThrow(new CannotCreateTransactionException("configuración privada ficticia"));
        comprobar(503, "DEPENDENCIA_NO_DISPONIBLE");
    }

    @Test
    void falloInesperadoDevuelve500Controlado() throws Exception {
        when(servicio.listar(any(), any()))
                .thenThrow(new IllegalStateException("cuerpo privado ficticio"));
        comprobar(500, "ERROR_INTERNO");
    }

    @Test
    void rolDesconocidoSeDeniegaAntesDeInvocarAplicacion() throws Exception {
        http.perform(
                        get("/api/proveedores")
                                .with(
                                        jwt().authorities(
                                                        new SimpleGrantedAuthority(
                                                                "ROLE_DESCONOCIDO"))))
                .andExpect(status().isForbidden())
                .andExpect(content().string("{\"error\":\"ACCESO_NO_PERMITIDO\"}"));
        org.mockito.Mockito.verifyNoInteractions(servicio);
    }

    private void comprobar(int estado, String codigo) throws Exception {
        http.perform(
                        get("/api/proveedores")
                                .with(
                                        jwt().jwt(
                                                        token ->
                                                                token.subject(
                                                                                UUID.randomUUID()
                                                                                        .toString())
                                                                        .claim(
                                                                                "roles",
                                                                                List.of(
                                                                                        "ADMINISTRADOR")))
                                                .authorities(
                                                        new SimpleGrantedAuthority(
                                                                "ROLE_ADMINISTRADOR"))))
                .andExpect(status().is(estado))
                .andExpect(content().string("{\"error\":\"" + codigo + "\"}"))
                .andExpect(
                        header().string(
                                        "Cache-Control",
                                        org.hamcrest.Matchers.containsString("no-store")));
    }
}
