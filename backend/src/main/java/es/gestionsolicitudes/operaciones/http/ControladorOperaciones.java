package es.gestionsolicitudes.operaciones.http;

import es.gestionsolicitudes.configuracion.ErroresControlados.ErrorPublico;
import es.gestionsolicitudes.operaciones.aplicacion.ServicioOperaciones;
import es.gestionsolicitudes.operaciones.dominio.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/operaciones-idempotentes")
@SecurityRequirement(name = "BearerAuth")
public class ControladorOperaciones {
    private final ServicioOperaciones servicio;

    public ControladorOperaciones(ServicioOperaciones servicio) {
        this.servicio = servicio;
    }

    @GetMapping("/{clave}")
    @Operation(
            summary = "Recuperar una operación propia",
            description =
                    "Permisos actuales y visibilidad. Progreso efímero de esta instancia o resultado mínimo confirmado. La clave no concede acceso; sin snapshot ni textos de negocio.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "EN_PROGRESO o COMPLETADA",
                content = @Content(schema = @Schema(implementation = EstadoOperacion.class))),
        @ApiResponse(
                responseCode = "400",
                description = "SOLICITUD_INVALIDA",
                content = @Content(schema = @Schema(implementation = ErrorPublico.class))),
        @ApiResponse(
                responseCode = "401",
                description = "NO_AUTENTICADO",
                content = @Content(schema = @Schema(implementation = ErrorPublico.class))),
        @ApiResponse(
                responseCode = "404",
                description = "OPERACION_NO_ENCONTRADA: inexistente o no visible",
                content = @Content(schema = @Schema(implementation = ErrorPublico.class))),
        @ApiResponse(
                responseCode = "503",
                description = "DEPENDENCIA_NO_DISPONIBLE",
                content = @Content(schema = @Schema(implementation = ErrorPublico.class)))
    })
    public EstadoOperacion consultar(
            @AuthenticationPrincipal Jwt token, @PathVariable String clave) {
        return servicio.consultar(UUID.fromString(token.getSubject()), HuellaOperacion.uuid(clave));
    }
}
