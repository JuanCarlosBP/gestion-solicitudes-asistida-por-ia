package es.gestionsolicitudes.identidad.http;

import es.gestionsolicitudes.configuracion.ErroresControlados.ErrorPublico;
import es.gestionsolicitudes.identidad.aplicacion.ServicioAutenticacion;
import es.gestionsolicitudes.identidad.dominio.UsuarioPublico;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ControladorIdentidad {
    private final ServicioAutenticacion servicio;

    public ControladorIdentidad(ServicioAutenticacion servicio) {
        this.servicio = servicio;
    }

    @GetMapping("/api/identidad/yo")
    @Operation(summary = "Consultar identidad actual")
    @SecurityRequirement(name = "BearerAuth")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Usuario público y roles vigentes",
                content = @Content(schema = @Schema(implementation = UsuarioPublico.class))),
        @ApiResponse(responseCode = "401", description = "No autenticado")
    })
    public ResponseEntity<?> yo(@AuthenticationPrincipal Jwt token) {
        return servicio.identidad(UUID.fromString(token.getSubject()))
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(
                        () -> ResponseEntity.status(401).body(new ErrorPublico("NO_AUTENTICADO")));
    }
}
