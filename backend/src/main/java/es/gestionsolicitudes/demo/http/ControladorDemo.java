package es.gestionsolicitudes.demo.http;

import es.gestionsolicitudes.demo.aplicacion.CredencialesDemo;
import es.gestionsolicitudes.demo.aplicacion.ServicioDemo;
import es.gestionsolicitudes.demo.dominio.ContextoDemo;
import es.gestionsolicitudes.demo.dominio.ErrorDemo;
import es.gestionsolicitudes.identidad.aplicacion.ServicioAutenticacion;
import es.gestionsolicitudes.identidad.dominio.Rol;
import es.gestionsolicitudes.identidad.http.ControladorAutenticacion.RespuestaAcceso;
import es.gestionsolicitudes.identidad.http.CookiesIdentidad;
import es.gestionsolicitudes.identidad.http.RepositorioCsrfPorEntorno;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Clock;
import java.time.Duration;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("demo")
@RequestMapping("/api/demo")
public class ControladorDemo {
    private final ServicioDemo servicio;
    private final CredencialesDemo credenciales;
    private final ServicioAutenticacion autenticacion;
    private final CookiesIdentidad cookies;
    private final RepositorioCsrfPorEntorno csrf;
    private final Clock reloj;

    public ControladorDemo(
            ServicioDemo servicio,
            CredencialesDemo credenciales,
            ServicioAutenticacion autenticacion,
            CookiesIdentidad cookies,
            RepositorioCsrfPorEntorno csrf,
            Clock reloj) {
        this.servicio = servicio;
        this.credenciales = credenciales;
        this.autenticacion = autenticacion;
        this.cookies = cookies;
        this.csrf = csrf;
        this.reloj = reloj;
    }

    @GetMapping
    public Map<String, Object> presentacion() {
        return Map.of(
                "habilitada",
                true,
                "cupo",
                servicio.propiedades().cupo(),
                "duracionMinutos",
                servicio.propiedades().duracionMinutos(),
                "disponibles",
                servicio.disponibles());
    }

    @PostMapping("/reservas")
    public ResponseEntity<ContextoDemo> reservar(
            HttpServletRequest peticion, HttpServletResponse respuesta) {
        var reserva = servicio.reservar(FiltroContextoDemo.cookie(peticion));
        respuesta.addHeader(
                HttpHeaders.SET_COOKIE,
                cookie(
                        peticion,
                        reserva.cookie(),
                        Math.max(
                                0,
                                Duration.between(reloj.instant(), reserva.contexto().expiraEn())
                                        .toSeconds())));
        return ResponseEntity.status(201).body(reserva.contexto());
    }

    @GetMapping("/reserva")
    public ContextoDemo reserva() {
        return ContextoDemo.exigir();
    }

    @PostMapping("/acceso")
    public RespuestaAcceso acceso(
            @RequestBody Map<String, String> entrada,
            HttpServletRequest peticion,
            HttpServletResponse respuesta) {
        if (!entrada.keySet().equals(java.util.Set.of("rol")))
            throw new ErrorDemo(400, "SOLICITUD_INVALIDA");
        Rol rol;
        if (entrada.get("rol") == null) throw new ErrorDemo(400, "SOLICITUD_INVALIDA");
        try {
            rol = Rol.valueOf(entrada.get("rol"));
        } catch (IllegalArgumentException error) {
            throw new ErrorDemo(400, "SOLICITUD_INVALIDA");
        }
        if (rol == Rol.ADMINISTRADOR) throw new ErrorDemo(403, "ACCESO_NO_PERMITIDO");
        var contexto = ContextoDemo.exigir();
        var acceso =
                autenticacion
                        .iniciar(
                                CredencialesDemo.correo(contexto.generacion(), rol),
                                credenciales.clave(contexto.espacio(), contexto.generacion(), rol))
                        .orElseThrow(() -> new ErrorDemo(401, "CREDENCIALES_INVALIDAS"));
        csrf.rotar(peticion, respuesta);
        respuesta.addHeader(
                HttpHeaders.SET_COOKIE,
                cookies.refresco(peticion, acceso.refresh(), acceso.expiraRefresh()));
        return new RespuestaAcceso(
                acceso.accessToken(), "Bearer", acceso.expiraEn(), acceso.usuario());
    }

    @PostMapping("/reserva/liberar")
    public ResponseEntity<Void> liberar(
            HttpServletRequest peticion, HttpServletResponse respuesta) {
        servicio.liberar(ContextoDemo.exigir());
        csrf.rotar(peticion, respuesta);
        respuesta.addHeader(HttpHeaders.SET_COOKIE, cookie(peticion, "", 0));
        respuesta.addHeader(HttpHeaders.SET_COOKIE, cookies.borrar(peticion));
        return ResponseEntity.noContent().header("Clear-Site-Data", "\"cache\"").build();
    }

    private String cookie(HttpServletRequest peticion, String valor, long segundos) {
        return ResponseCookie.from(FiltroContextoDemo.COOKIE, valor)
                .httpOnly(true)
                .secure(cookies.segura(peticion))
                .sameSite("Strict")
                .path("/api")
                .maxAge(segundos)
                .build()
                .toString();
    }
}
