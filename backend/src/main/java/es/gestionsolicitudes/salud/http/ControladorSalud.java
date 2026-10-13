package es.gestionsolicitudes.salud.http;

import es.gestionsolicitudes.salud.aplicacion.EstadoSalud;
import es.gestionsolicitudes.salud.aplicacion.ServicioSalud;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ControladorSalud {
    private final ServicioSalud servicio;

    public ControladorSalud(ServicioSalud servicio) {
        this.servicio = servicio;
    }

    @Operation(
            summary = "Consultar disponibilidad técnica",
            description = "No acredita funciones de negocio.")
    @ApiResponse(
            responseCode = "200",
            description = "Aplicación y PostgreSQL disponibles",
            content = @Content(schema = @Schema(implementation = RespuestaSalud.class)))
    @ApiResponse(
            responseCode = "503",
            description = "Dependencia temporalmente no disponible",
            content = @Content(schema = @Schema(implementation = RespuestaSalud.class)))
    @GetMapping(value = "/api/salud", produces = "application/json")
    public ResponseEntity<RespuestaSalud> consultar() {
        var estado = servicio.comprobar();
        var codigo =
                estado == EstadoSalud.DISPONIBLE ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
        return ResponseEntity.status(codigo).body(new RespuestaSalud(estado));
    }
}
