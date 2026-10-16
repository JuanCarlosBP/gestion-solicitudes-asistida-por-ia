package es.gestionsolicitudes.solicitudes.dominio;

import java.time.Instant;
import java.util.UUID;

public record ResultadoDecision(
        UUID id,
        String numero,
        String estado,
        long version,
        Instant actualizadoEn,
        Instant decididoEn) {}
