package es.gestionsolicitudes.salud.http;

import es.gestionsolicitudes.salud.aplicacion.EstadoSalud;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Disponibilidad técnica de la aplicación y PostgreSQL")
public record RespuestaSalud(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) EstadoSalud estado) {}
