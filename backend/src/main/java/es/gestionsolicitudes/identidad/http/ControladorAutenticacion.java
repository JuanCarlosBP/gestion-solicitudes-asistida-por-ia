package es.gestionsolicitudes.identidad.http;

import es.gestionsolicitudes.configuracion.ErroresControlados.ErrorPublico;
import es.gestionsolicitudes.identidad.aplicacion.AccesoEmitido;
import es.gestionsolicitudes.identidad.aplicacion.ServicioAutenticacion;
import es.gestionsolicitudes.identidad.dominio.UsuarioPublico;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/autenticacion")
public class ControladorAutenticacion {
    private final ServicioAutenticacion servicio;
    private final CookiesIdentidad cookies;
    private final RepositorioCsrfPorEntorno csrf;

    public ControladorAutenticacion(
            ServicioAutenticacion servicio,
            CookiesIdentidad cookies,
            RepositorioCsrfPorEntorno csrf) {
        this.servicio = servicio;
        this.cookies = cookies;
        this.csrf = csrf;
    }

    public record SolicitudLogin(
            String correo,
            @Schema(accessMode = Schema.AccessMode.WRITE_ONLY, format = "password")
                    String contrasena) {
        @Override
        public String toString() {
            return "SolicitudLogin[credenciales omitidas]";
        }
    }

    public record RespuestaAcceso(
            String accessToken, String tipoToken, long expiraEn, UsuarioPublico usuario) {
        @Override
        public String toString() {
            return "RespuestaAcceso[credenciales omitidas]";
        }
    }

    @GetMapping("/csrf")
    @Operation(
            summary = "Materializar cookie XSRF-TOKEN",
            description =
                    "Enviar su valor en X-XSRF-TOKEN en todas las operaciones mutables. Cookie SameSite=Strict.")
    @ApiResponse(responseCode = "204", description = "Cookie XSRF disponible")
    public ResponseEntity<Void> csrf(CsrfToken token) {
        token.getToken();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/iniciar-sesion")
    @Operation(
            summary = "Iniciar sesión",
            description =
                    "Requiere X-XSRF-TOKEN. Refresh exclusivamente en cookie HttpOnly REFRESH-TOKEN; acceso Bearer en memoria.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Acceso emitido",
                content = @Content(schema = @Schema(implementation = RespuestaAcceso.class))),
        @ApiResponse(responseCode = "401", description = "Credenciales inválidas"),
        @ApiResponse(responseCode = "403", description = "CSRF inválido")
    })
    public ResponseEntity<?> iniciar(
            @RequestBody SolicitudLogin entrada,
            HttpServletRequest peticion,
            HttpServletResponse respuestaHttp) {
        return servicio.iniciar(entrada.correo(), entrada.contrasena())
                .<ResponseEntity<?>>map(
                        acceso -> {
                            csrf.rotar(peticion, respuestaHttp);
                            return respuesta(acceso, peticion, respuestaHttp);
                        })
                .orElseGet(
                        () ->
                                ResponseEntity.status(401)
                                        .body(new ErrorPublico("CREDENCIALES_INVALIDAS")));
    }

    @PostMapping("/renovar")
    @Operation(
            summary = "Rotar refresh y renovar acceso",
            description =
                    "Requiere cookies REFRESH-TOKEN, XSRF-TOKEN y cabecera X-XSRF-TOKEN. No enviar Bearer. La familia caduca a las ocho horas sin ampliación.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Acceso emitido y cookie rotada",
                content = @Content(schema = @Schema(implementation = RespuestaAcceso.class))),
        @ApiResponse(responseCode = "401", description = "No autenticado; cookie borrada"),
        @ApiResponse(responseCode = "403", description = "CSRF inválido")
    })
    public ResponseEntity<?> renovar(
            @CookieValue(name = CookiesIdentidad.REFRESH, required = false) String refresh,
            HttpServletRequest peticion,
            HttpServletResponse respuestaHttp) {
        return servicio.renovar(refresh)
                .<ResponseEntity<?>>map(acceso -> respuesta(acceso, peticion, respuestaHttp))
                .orElseGet(
                        () ->
                                ResponseEntity.status(401)
                                        .header(HttpHeaders.SET_COOKIE, cookies.borrar(peticion))
                                        .body(new ErrorPublico("NO_AUTENTICADO")));
    }

    @PostMapping("/cerrar-sesion")
    @Operation(
            summary = "Revocar sesión y borrar cookie",
            description =
                    "Idempotente; exige X-XSRF-TOKEN. Revoca también los access tokens de la sesión.")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Cierre completado"),
        @ApiResponse(responseCode = "403", description = "CSRF inválido")
    })
    public ResponseEntity<Void> cerrar(
            @CookieValue(name = CookiesIdentidad.REFRESH, required = false) String refresh,
            HttpServletRequest peticion,
            HttpServletResponse respuestaHttp) {
        servicio.cerrar(refresh);
        csrf.rotar(peticion, respuestaHttp);
        respuestaHttp.addHeader(HttpHeaders.SET_COOKIE, cookies.borrar(peticion));
        return ResponseEntity.noContent().header("Clear-Site-Data", "\"cache\"").build();
    }

    private ResponseEntity<RespuestaAcceso> respuesta(
            AccesoEmitido acceso, HttpServletRequest peticion, HttpServletResponse respuestaHttp) {
        // Agregar ambas cookies en la misma respuesta evita que ResponseEntity
        // sustituya el Set-Cookie de XSRF por el de refresh.
        respuestaHttp.addHeader(
                HttpHeaders.SET_COOKIE,
                cookies.refresco(peticion, acceso.refresh(), acceso.expiraRefresh()));
        return ResponseEntity.ok()
                .body(
                        new RespuestaAcceso(
                                acceso.accessToken(),
                                "Bearer",
                                acceso.expiraEn(),
                                acceso.usuario()));
    }
}
