package es.gestionsolicitudes.identidad.dominio;

import java.time.Instant;
import java.util.UUID;

public record TokenRefresco(
        UUID id,
        UUID sesionId,
        UUID familiaId,
        byte[] secretoHash,
        String estado,
        Instant creadoEn,
        Instant expiraEn) {
    public TokenRefresco {
        secretoHash = secretoHash.clone();
    }

    @Override
    public byte[] secretoHash() {
        return secretoHash.clone();
    }

    @Override
    public String toString() {
        return "TokenRefresco[datos internos omitidos]";
    }
}
