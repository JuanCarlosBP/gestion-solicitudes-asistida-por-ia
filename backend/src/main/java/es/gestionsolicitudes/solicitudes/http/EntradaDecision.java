package es.gestionsolicitudes.solicitudes.http;

import es.gestionsolicitudes.solicitudes.dominio.*;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Set;
import tools.jackson.databind.JsonNode;

public final class EntradaDecision {
    private EntradaDecision() {}

    @Schema(
            name = "EntradaAprobacionSolicitud",
            additionalProperties = Schema.AdditionalPropertiesValue.FALSE,
            requiredProperties = {"version"})
    public record Aprobacion(
            @Schema(minimum = "0") long version,
            @Schema(maxLength = 500, nullable = true) String comentario) {}

    @Schema(
            name = "EntradaRechazoSolicitud",
            additionalProperties = Schema.AdditionalPropertiesValue.FALSE,
            requiredProperties = {"version", "motivo"})
    public record Rechazo(
            @Schema(minimum = "0") long version,
            @Schema(minLength = 10, maxLength = 1000) String motivo) {}

    public static DatosDecision leer(JsonNode entrada, DatosDecision.Tipo tipo) {
        if (entrada == null || !entrada.isObject()) throw ErrorSolicitud.invalida();
        String campo = tipo == DatosDecision.Tipo.APROBAR ? "comentario" : "motivo";
        if (!Set.of("version", campo).containsAll(entrada.propertyNames()))
            throw ErrorSolicitud.invalida();
        EntradaSolicitud.version(entrada, false);
        JsonNode valor = entrada.get(campo);
        String texto = null;
        if (valor != null && !valor.isNull()) {
            if (!valor.isString()) throw ErrorSolicitud.invalida();
            texto = valor.asString();
        }
        return tipo == DatosDecision.Tipo.APROBAR
                ? new DatosDecision(tipo, texto, null)
                : new DatosDecision(tipo, null, texto);
    }
}
