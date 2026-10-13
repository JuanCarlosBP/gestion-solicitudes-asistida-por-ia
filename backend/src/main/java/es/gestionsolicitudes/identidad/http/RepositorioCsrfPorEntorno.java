package es.gestionsolicitudes.identidad.http;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;

/** Delega la generación y comparación XSRF a Spring, con Secure restringido por petición. */
public class RepositorioCsrfPorEntorno implements CsrfTokenRepository {
    private final CookiesIdentidad cookies;
    private final CookieCsrfTokenRepository seguro = crear(true);
    private final CookieCsrfTokenRepository local = crear(false);

    public RepositorioCsrfPorEntorno(CookiesIdentidad cookies) {
        this.cookies = cookies;
    }

    private CookieCsrfTokenRepository crear(boolean seguro) {
        var repositorio = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repositorio.setCookieCustomizer(
                cookie -> cookie.path("/").sameSite("Strict").secure(seguro));
        return repositorio;
    }

    private CookieCsrfTokenRepository seleccionar(HttpServletRequest peticion) {
        return cookies.segura(peticion) ? seguro : local;
    }

    @Override
    public CsrfToken generateToken(HttpServletRequest peticion) {
        return seleccionar(peticion).generateToken(peticion);
    }

    @Override
    public void saveToken(
            CsrfToken token, HttpServletRequest peticion, HttpServletResponse respuesta) {
        seleccionar(peticion).saveToken(token, peticion, respuesta);
    }

    @Override
    public CsrfToken loadToken(HttpServletRequest peticion) {
        return seleccionar(peticion).loadToken(peticion);
    }
}
