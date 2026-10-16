package es.gestionsolicitudes.historial.http;

import es.gestionsolicitudes.configuracion.ErroresControlados.ErrorPublico;
import es.gestionsolicitudes.historial.aplicacion.ServicioHistorial;
import es.gestionsolicitudes.historial.dominio.*;
import es.gestionsolicitudes.solicitudes.http.*;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

@RestController
@SecurityRequirement(name = "BearerAuth")
@ApiResponses({
    @ApiResponse(
            responseCode = "400",
            description = "SOLICITUD_INVALIDA: UUID, filtro, rango o parámetros incorrectos",
            content = @Content(schema = @Schema(implementation = ErrorPublico.class))),
    @ApiResponse(
            responseCode = "401",
            description = "NO_AUTENTICADO",
            content = @Content(schema = @Schema(implementation = ErrorPublico.class))),
    @ApiResponse(
            responseCode = "403",
            description = "ACCESO_NO_PERMITIDO: permisos vigentes insuficientes",
            content = @Content(schema = @Schema(implementation = ErrorPublico.class))),
    @ApiResponse(
            responseCode = "500",
            description = "ERROR_INTERNO",
            content = @Content(schema = @Schema(implementation = ErrorPublico.class))),
    @ApiResponse(
            responseCode = "503",
            description = "DEPENDENCIA_NO_DISPONIBLE",
            content = @Content(schema = @Schema(implementation = ErrorPublico.class)))
})
public class ControladorHistorial {
    private static final String PAGINA =
            "Orden fijo ocurridoEn DESC, id prefijado DESC; UUID no es secuencia. page*size máximo100000. Conteo y elementos coherentes en una lectura; no snapshot entre páginas concurrentes. Desde/hasta ISO con offset inclusivos. Parámetros desconocidos, duplicados, vacíos o rango invertido400. Respuesta no-store. Eventos V7 y decisiones V5 originales, sin textos privados ni duplicados. historiaAnteriorDesconocida se calcula sin filtros.";
    private final ServicioHistorial servicio;

    public ControladorHistorial(ServicioHistorial servicio) {
        this.servicio = servicio;
    }

    @GetMapping("/api/solicitudes/{id}/historial")
    @Operation(
            summary = "Consultar historial autorizado de solicitud",
            description =
                    "Roles vigentes: SOLICITANTE propias; SUPERVISOR asignadas no BORRADOR; AUDITOR/ADMINISTRADOR todas. Unión multirrol. "
                            + PAGINA)
    @Parameters({
        @Parameter(
                in = ParameterIn.QUERY,
                name = "page",
                schema = @Schema(type = "integer", minimum = "0", defaultValue = "0")),
        @Parameter(
                in = ParameterIn.QUERY,
                name = "size",
                schema =
                        @Schema(
                                type = "integer",
                                minimum = "1",
                                maximum = "100",
                                defaultValue = "20")),
        @Parameter(
                in = ParameterIn.QUERY,
                name = "accion",
                schema = @Schema(implementation = AccionHistorial.class)),
        @Parameter(
                in = ParameterIn.QUERY,
                name = "actor",
                schema = @Schema(type = "string", format = "uuid")),
        @Parameter(
                in = ParameterIn.QUERY,
                name = "desde",
                schema = @Schema(type = "string", format = "date-time")),
        @Parameter(
                in = ParameterIn.QUERY,
                name = "hasta",
                schema = @Schema(type = "string", format = "date-time"))
    })
    @ApiResponse(
            responseCode = "200",
            description = "Página de hechos conocidos; aviso si falta creaciónV7",
            content = @Content(schema = @Schema(implementation = PaginaHistorial.class)))
    @ApiResponse(
            responseCode = "404",
            description = "SOLICITUD_NO_ENCONTRADA: inexistente o no visible",
            content = @Content(schema = @Schema(implementation = ErrorPublico.class)))
    public PaginaHistorial solicitud(
            @AuthenticationPrincipal Jwt token,
            @Parameter(schema = @Schema(type = "string", format = "uuid")) @PathVariable String id,
            @Parameter(hidden = true) @RequestParam MultiValueMap<String, String> filtros) {
        return servicio.solicitud(
                usuario(token), EntradaSolicitud.uuid(id), FiltrosHistorial.leer(filtros, false));
    }

    @GetMapping("/api/proveedores/{id}/historial")
    @Operation(
            summary = "Consultar historial interno de proveedor",
            description =
                    "Solo AUDITOR/ADMINISTRADOR vigentes, incluidos proveedores inactivos. "
                            + PAGINA)
    @Parameters({
        @Parameter(
                in = ParameterIn.QUERY,
                name = "page",
                schema = @Schema(type = "integer", minimum = "0", defaultValue = "0")),
        @Parameter(
                in = ParameterIn.QUERY,
                name = "size",
                schema =
                        @Schema(
                                type = "integer",
                                minimum = "1",
                                maximum = "100",
                                defaultValue = "20")),
        @Parameter(
                in = ParameterIn.QUERY,
                name = "accion",
                schema = @Schema(implementation = AccionHistorial.class)),
        @Parameter(
                in = ParameterIn.QUERY,
                name = "actor",
                schema = @Schema(type = "string", format = "uuid")),
        @Parameter(
                in = ParameterIn.QUERY,
                name = "desde",
                schema = @Schema(type = "string", format = "date-time")),
        @Parameter(
                in = ParameterIn.QUERY,
                name = "hasta",
                schema = @Schema(type = "string", format = "date-time"))
    })
    @ApiResponse(
            responseCode = "200",
            description = "Página sin fiscal, contacto ni cuerpos",
            content = @Content(schema = @Schema(implementation = PaginaHistorial.class)))
    @ApiResponse(
            responseCode = "404",
            description = "PROVEEDOR_NO_ENCONTRADO: inexistente o no visible",
            content = @Content(schema = @Schema(implementation = ErrorPublico.class)))
    public PaginaHistorial proveedor(
            @AuthenticationPrincipal Jwt token,
            @Parameter(schema = @Schema(type = "string", format = "uuid")) @PathVariable String id,
            @Parameter(hidden = true) @RequestParam MultiValueMap<String, String> filtros) {
        return servicio.proveedor(
                usuario(token), EntradaSolicitud.uuid(id), FiltrosHistorial.leer(filtros, false));
    }

    @GetMapping("/api/historial")
    @Operation(
            summary = "Consultar auditoría global",
            description =
                    "Solo AUDITOR/ADMINISTRADOR vigentes. historiaAnteriorDesconocida siempre true: no existe reconstrucción del pasado anterior aV7. "
                            + PAGINA)
    @Parameters({
        @Parameter(
                in = ParameterIn.QUERY,
                name = "page",
                schema = @Schema(type = "integer", minimum = "0", defaultValue = "0")),
        @Parameter(
                in = ParameterIn.QUERY,
                name = "size",
                schema =
                        @Schema(
                                type = "integer",
                                minimum = "1",
                                maximum = "100",
                                defaultValue = "20")),
        @Parameter(
                in = ParameterIn.QUERY,
                name = "accion",
                schema = @Schema(implementation = AccionHistorial.class)),
        @Parameter(
                in = ParameterIn.QUERY,
                name = "actor",
                schema = @Schema(type = "string", format = "uuid")),
        @Parameter(
                in = ParameterIn.QUERY,
                name = "desde",
                schema = @Schema(type = "string", format = "date-time")),
        @Parameter(
                in = ParameterIn.QUERY,
                name = "hasta",
                schema = @Schema(type = "string", format = "date-time")),
        @Parameter(
                in = ParameterIn.QUERY,
                name = "tipoRecurso",
                schema = @Schema(implementation = TipoRecurso.class)),
        @Parameter(
                in = ParameterIn.QUERY,
                name = "recursoId",
                schema = @Schema(type = "string", format = "uuid"))
    })
    @ApiResponse(
            responseCode = "200",
            description = "Página global de proyecciones mínimas V7/V5",
            content = @Content(schema = @Schema(implementation = PaginaHistorial.class)))
    public PaginaHistorial global(
            @AuthenticationPrincipal Jwt token,
            @Parameter(hidden = true) @RequestParam MultiValueMap<String, String> filtros) {
        return servicio.global(usuario(token), FiltrosHistorial.leer(filtros, true));
    }

    @GetMapping("/api/resumen")
    @Operation(
            summary = "Contar solicitudes visibles y acciones personales",
            description =
                    "Identidad y roles actuales. Unión de visibilidad sin duplicar filas. Pendientes: borradores propios con SOLICITANTE; presentadas asignadas con SUPERVISOR y distinto del autor. AUDITOR/ADMINISTRADOR solos no adquieren pendientes ajenos. Sin parámetros; no-store.")
    @ApiResponse(
            responseCode = "200",
            description = "Contadores exactos de la lectura actual",
            content = @Content(schema = @Schema(implementation = ResumenAplicacion.class)))
    public ResumenAplicacion resumen(
            @AuthenticationPrincipal Jwt token,
            @Parameter(hidden = true) @RequestParam MultiValueMap<String, String> filtros) {
        FiltrosSolicitudes.validar(filtros, Set.of());
        return servicio.resumen(usuario(token));
    }

    private static UUID usuario(Jwt token) {
        return UUID.fromString(token.getSubject());
    }
}
