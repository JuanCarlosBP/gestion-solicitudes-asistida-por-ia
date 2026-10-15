package es.gestionsolicitudes.historial.dominio;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;

public record EventoHistorial(
        @Schema(
                        description =
                                "Clave estable de la fuente; UUID no representa secuencia temporal",
                        pattern = "^(EVENTO|DECISION):[0-9a-f-]{36}$")
                String id,
        TipoRecurso tipoRecurso,
        UUID recursoId,
        AccionHistorial accion,
        Actor actor,
        Instant ocurridoEn,
        @Schema(nullable = true, minimum = "0", description = "Null en la creación")
                Long versionAnterior,
        long versionResultante,
        @Schema(nullable = true, description = "Null en la creación") String estadoAnterior,
        String estadoResultante,
        String resumen,
        Origen origen) {
    public record Actor(UUID id, String nombreVisible) {}

    public enum Origen {
        EVENTO_V7,
        DECISION_V5
    }
}
