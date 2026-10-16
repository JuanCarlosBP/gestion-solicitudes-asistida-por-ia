package es.gestionsolicitudes.identidad.http;

import static org.assertj.core.api.Assertions.*;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;

class CookiesIdentidadTest {
    private final Instant ahora = Instant.parse("2026-10-14T00:00:00Z");

    @Test
    void secureSoloSeRelajaEnPerfilLocalHttpYHostLoopback() {
        for (String perfil : new String[] {"local", "test", "produccion"}) {
            var entorno = new MockEnvironment();
            entorno.setActiveProfiles(perfil);
            var cookies = new CookiesIdentidad(entorno, Clock.fixed(ahora, ZoneOffset.UTC));
            for (String host :
                    new String[] {
                        "localhost",
                        "127.0.0.1",
                        "::1",
                        "[::1]",
                        "ajeno.invalid",
                        "localhost.ajeno.invalid"
                    }) {
                var peticion = new MockHttpServletRequest();
                peticion.setServerName(host);
                boolean loopback = !host.contains("invalid");
                assertThat(cookies.segura(peticion))
                        .isEqualTo(!perfil.equals("local") || !loopback);
                peticion.setSecure(true);
                assertThat(cookies.segura(peticion)).isTrue();
            }
        }
    }

    @Test
    void cookieRefrescoRestringeAtributosYCaducidadYElBorradoEsExplicito() {
        var entorno = new MockEnvironment();
        var cookies = new CookiesIdentidad(entorno, Clock.fixed(ahora, ZoneOffset.UTC));
        String valor =
                cookies.refresco(
                        new MockHttpServletRequest(), "ficticio-no-valido", ahora.plusSeconds(37));
        assertThat(valor.contains("HttpOnly")).isTrue();
        assertThat(valor.contains("Secure")).isTrue();
        assertThat(valor.contains("SameSite=Strict")).isTrue();
        assertThat(valor.contains("Path=/api/autenticacion")).isTrue();
        assertThat(valor.contains("Max-Age=37")).isTrue();
        assertThat(valor.contains("Domain=")).isFalse();
        assertThat(cookies.borrar(new MockHttpServletRequest()))
                .contains("REFRESH-TOKEN=;", "Max-Age=0", "HttpOnly", "Secure");
    }
}
