package es.gestionsolicitudes.identidad.aplicacion;

import es.gestionsolicitudes.identidad.dominio.UsuarioPublico;
import java.time.Instant;

/** Resultado interno. HTTP publica únicamente el acceso y guarda el refresh en cookie HttpOnly. */
public record AccesoEmitido(
        String accessToken,
        long expiraEn,
        UsuarioPublico usuario,
        String refresh,
        Instant expiraRefresh) {
    @Override
    public String toString() {
        return "AccesoEmitido[credenciales omitidas]";
    }
}
