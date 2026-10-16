package es.gestionsolicitudes.solicitudes.dominio;

import java.time.Instant;

public record DecisionSolicitud(
        DatosDecision.Tipo tipo,
        Solicitud.Persona actor,
        String comentario,
        String motivo,
        Instant decididoEn) {}
