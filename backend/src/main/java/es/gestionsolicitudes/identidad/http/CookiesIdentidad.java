package es.gestionsolicitudes.identidad.http;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookiesIdentidad {
    public static final String REFRESH = "REFRESH-TOKEN";
    private static final Set<String> LOOPBACK = Set.of("localhost", "127.0.0.1", "::1", "[::1]");
    private final boolean local;
    private final Clock reloj;

    public CookiesIdentidad(Environment entorno, Clock reloj) {
        this.local = entorno.acceptsProfiles(Profiles.of("local"));
        this.reloj = reloj;
    }

    public boolean segura(HttpServletRequest peticion) {
        return !local || peticion.isSecure() || !LOOPBACK.contains(peticion.getServerName());
    }

    public String refresco(HttpServletRequest peticion, String valor, Instant fin) {
        long segundos = Math.max(0, Duration.between(reloj.instant(), fin).toSeconds());
        return crear(peticion, valor, segundos);
    }

    public String borrar(HttpServletRequest peticion) {
        return crear(peticion, "", 0);
    }

    private String crear(HttpServletRequest peticion, String valor, long segundos) {
        return ResponseCookie.from(REFRESH, valor)
                .httpOnly(true)
                .secure(segura(peticion))
                .path("/api/autenticacion")
                .sameSite("Strict")
                .maxAge(segundos)
                .build()
                .toString();
    }
}
