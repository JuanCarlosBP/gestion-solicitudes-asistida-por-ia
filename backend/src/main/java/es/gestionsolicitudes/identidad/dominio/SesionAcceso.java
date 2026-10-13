package es.gestionsolicitudes.identidad.dominio;

import java.time.Instant;
import java.util.UUID;

public record SesionAcceso(
        UUID id,
        UUID usuarioId,
        UUID familiaId,
        UUID tokenActual,
        Instant creadoEn,
        Instant expiraEn,
        Instant revocadoEn) {
    public boolean activa(Instant ahora) {
        return revocadoEn == null && ahora.isBefore(expiraEn);
    }
}
