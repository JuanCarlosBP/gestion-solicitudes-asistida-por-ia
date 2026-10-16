package es.gestionsolicitudes.identidad.http;

import es.gestionsolicitudes.solicitudes.aplicacion.ServicioSolicitudes;
import es.gestionsolicitudes.solicitudes.dominio.*;
import es.gestionsolicitudes.solicitudes.http.*;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.Set;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

@RestController
@SecurityRequirement(name = "BearerAuth")
public class ControladorSupervisores {
    private final ServicioSolicitudes servicio;

    public ControladorSupervisores(ServicioSolicitudes servicio) {
        this.servicio = servicio;
    }

    @GetMapping("/api/identidad/supervisores")
    @Operation(
            summary = "Seleccionar supervisor habilitado",
            description =
                    "Autenticado. Solo id y nombreVisible; rol SUPERVISOR actual, distinto del actor; nombre contiene literal; orden nombreVisible asc/id asc.")
    @Parameters({
        @Parameter(name = "nombre", schema = @Schema(type = "string", maxLength = 128)),
        @Parameter(
                name = "page",
                schema = @Schema(type = "integer", minimum = "0", defaultValue = "0")),
        @Parameter(
                name = "size",
                schema =
                        @Schema(
                                type = "integer",
                                minimum = "1",
                                maximum = "100",
                                defaultValue = "20"))
    })
    @ApiResponses({
        @ApiResponse(responseCode = "400", description = "SOLICITUD_INVALIDA"),
        @ApiResponse(responseCode = "401", description = "NO_AUTENTICADO"),
        @ApiResponse(responseCode = "500", description = "ERROR_INTERNO"),
        @ApiResponse(responseCode = "503", description = "DEPENDENCIA_NO_DISPONIBLE")
    })
    public Pagina<Solicitud.Persona> listar(
            @AuthenticationPrincipal Jwt token,
            @Parameter(hidden = true) @RequestParam MultiValueMap<String, String> filtros) {
        FiltrosSolicitudes.validar(filtros, Set.of("nombre", "page", "size"));
        return servicio.supervisores(
                ControladorSolicitudes.actor(token),
                FiltrosSolicitudes.valor(filtros, "nombre", ""),
                FiltrosSolicitudes.entero(FiltrosSolicitudes.valor(filtros, "page", "0")),
                FiltrosSolicitudes.entero(FiltrosSolicitudes.valor(filtros, "size", "20")));
    }
}
