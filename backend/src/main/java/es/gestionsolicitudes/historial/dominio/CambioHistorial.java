package es.gestionsolicitudes.historial.dominio;

import java.time.Instant;
import java.util.UUID;

/** Solo datos de transición; no acepta cuerpos ni texto privado de negocio. */
public record CambioHistorial(
        TipoRecurso tipoRecurso,
        UUID recursoId,
        AccionHistorial accion,
        UUID actorId,
        Long versionAnterior,
        long versionResultante,
        String estadoAnterior,
        String estadoResultante,
        Instant ocurridoEn,
        UUID peticionId) {}
