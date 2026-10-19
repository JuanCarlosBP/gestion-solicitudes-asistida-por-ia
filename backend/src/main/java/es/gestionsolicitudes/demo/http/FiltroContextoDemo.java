package es.gestionsolicitudes.demo.http;

import es.gestionsolicitudes.demo.aplicacion.ServicioDemo;
import es.gestionsolicitudes.demo.dominio.ContextoDemo;
import es.gestionsolicitudes.demo.dominio.ErrorDemo;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import org.springframework.web.filter.OncePerRequestFilter;

/** Se instala antes de Bearer: incluso la consulta de sid necesita un ámbito admitido. */
public final class FiltroContextoDemo extends OncePerRequestFilter {
    public static final String COOKIE = "DEMO-RESERVA";
    private final ServicioDemo servicio;

    public FiltroContextoDemo(ServicioDemo servicio) {
        this.servicio = servicio;
    }

    public static boolean publica(HttpServletRequest peticion) {
        String ruta = peticion.getRequestURI();
        return ("GET".equals(peticion.getMethod())
                        && (ruta.equals("/api/demo")
                                || ruta.equals("/api/salud")
                                || ruta.equals("/api/autenticacion/csrf")))
                || ("POST".equals(peticion.getMethod()) && ruta.equals("/api/demo/reservas"));
    }

    public static String cookie(HttpServletRequest peticion) {
        if (peticion.getCookies() == null) return null;
        var coincidencias =
                Arrays.stream(peticion.getCookies())
                        .filter(c -> COOKIE.equals(c.getName()))
                        .toList();
        return coincidencias.size() == 1 ? coincidencias.getFirst().getValue() : null;
    }

    @Override
    protected boolean shouldNotFilterAsyncDispatch() {
        return false;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest peticion, HttpServletResponse respuesta, FilterChain cadena)
            throws ServletException, IOException {
        respuesta.setHeader("Cache-Control", "no-store");
        if (publica(peticion) || !peticion.getRequestURI().startsWith("/api/")) {
            cadena.doFilter(peticion, respuesta);
            return;
        }
        if (peticion.isAsyncStarted() || isAsyncDispatch(peticion)) {
            error(respuesta, 401, "DEMO_RESERVA_INVALIDA");
            return;
        }
        try {
            servicio.<ServletException, IOException>admitir(
                    cookie(peticion),
                    peticion.getHeader("X-Demo-Contexto"),
                    contexto -> {
                        ContextoDemo.instalar(contexto);
                        String ruta = peticion.getRequestURI();
                        boolean seguridad =
                                ruta.equals("/api/demo/reserva/liberar")
                                        || ruta.equals("/api/autenticacion/cerrar-sesion");
                        if (!seguridad) {
                            servicio.limitarPeticion(
                                    contexto,
                                    ruta.startsWith("/api/autenticacion/")
                                            || ruta.equals("/api/demo/acceso"));
                        }
                        boolean negocio =
                                !ruta.startsWith("/api/demo/")
                                        && !ruta.startsWith("/api/autenticacion/")
                                        && !ruta.startsWith("/api/identidad/");
                        if (negocio
                                && !"GET".equals(peticion.getMethod())
                                && !"HEAD".equals(peticion.getMethod())
                                && !"OPTIONS".equals(peticion.getMethod()))
                            servicio.comprobarEscritura(contexto);
                        cadena.doFilter(
                                new HttpServletRequestWrapper(peticion) {
                                    @Override
                                    public boolean isAsyncSupported() {
                                        return false;
                                    }

                                    @Override
                                    public jakarta.servlet.AsyncContext startAsync() {
                                        throw new IllegalStateException(
                                                "Asincronía demo no admitida");
                                    }

                                    @Override
                                    public jakarta.servlet.AsyncContext startAsync(
                                            jakarta.servlet.ServletRequest solicitud,
                                            jakarta.servlet.ServletResponse salida) {
                                        throw new IllegalStateException(
                                                "Asincronía demo no admitida");
                                    }
                                },
                                respuesta);
                    });
        } catch (ErrorDemo error) {
            error(respuesta, error.estado(), error.codigo());
        } catch (org.springframework.dao.DataAccessException error) {
            error(respuesta, 503, "DEPENDENCIA_NO_DISPONIBLE");
        } finally {
            ContextoDemo.limpiar();
        }
    }

    private void error(HttpServletResponse respuesta, int estado, String codigo)
            throws IOException {
        respuesta.setStatus(estado);
        respuesta.setContentType("application/json");
        respuesta.setCharacterEncoding("UTF-8");
        if (estado == 429) respuesta.setHeader("Retry-After", "60");
        respuesta.getWriter().write("{\"error\":\"" + codigo + "\"}");
    }
}
