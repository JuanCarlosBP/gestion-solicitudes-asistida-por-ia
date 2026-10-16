package es.gestionsolicitudes.solicitudes.http;

import es.gestionsolicitudes.configuracion.ErroresControlados.ErrorPublico;
import es.gestionsolicitudes.identidad.dominio.Rol;
import es.gestionsolicitudes.solicitudes.aplicacion.ServicioSolicitudes;
import es.gestionsolicitudes.solicitudes.dominio.*;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.net.URI;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/solicitudes")
@SecurityRequirement(name = "BearerAuth")
@ApiResponses({
    @ApiResponse(
            responseCode = "400",
            description = "SOLICITUD_INVALIDA",
            content = @Content(schema = @Schema(implementation = ErrorPublico.class))),
    @ApiResponse(
            responseCode = "401",
            description = "NO_AUTENTICADO",
            content = @Content(schema = @Schema(implementation = ErrorPublico.class))),
    @ApiResponse(
            responseCode = "403",
            description = "ACCESO_NO_PERMITIDO o CSRF ausente",
            content = @Content(schema = @Schema(implementation = ErrorPublico.class))),
    @ApiResponse(
            responseCode = "404",
            description = "SOLICITUD_NO_ENCONTRADA: inexistente o no visible",
            content = @Content(schema = @Schema(implementation = ErrorPublico.class))),
    @ApiResponse(
            responseCode = "409",
            description =
                    "VERSION_OBSOLETA, SOLICITUD_NO_EDITABLE, SOLICITUD_NO_DECIDIBLE, PROVEEDOR_INACTIVO, SUPERVISOR_INVALIDO, CLAVE_IDEMPOTENCIA_REUTILIZADA u OPERACION_EN_PROGRESO",
            headers =
                    @Header(
                            name = "Retry-After",
                            description = "1 solo para OPERACION_EN_PROGRESO",
                            schema = @Schema(type = "integer")),
            content = @Content(schema = @Schema(implementation = ErrorPublico.class))),
    @ApiResponse(
            responseCode = "500",
            description = "ERROR_INTERNO",
            content = @Content(schema = @Schema(implementation = ErrorPublico.class))),
    @ApiResponse(
            responseCode = "503",
            description = "DEPENDENCIA_NO_DISPONIBLE o NUMERACION_AGOTADA",
            content = @Content(schema = @Schema(implementation = ErrorPublico.class)))
})
public class ControladorSolicitudes {
    private final ServicioSolicitudes servicio;

    public ControladorSolicitudes(ServicioSolicitudes servicio) {
        this.servicio = servicio;
    }

    @PostMapping
    @Operation(
            summary = "Crear borrador propio",
            description =
                    "SOLICITANTE y X-XSRF-TOKEN. Solo asunto; número, autor, estado, importes, versión y fechas del servidor.",
            requestBody =
                    @io.swagger.v3.oas.annotations.parameters.RequestBody(
                            required = true,
                            content =
                                    @Content(
                                            schema =
                                                    @Schema(
                                                            implementation =
                                                                    EntradaSolicitud.Alta.class))))
    @ApiResponse(
            responseCode = "201",
            description = "Borrador creado",
            content = @Content(schema = @Schema(implementation = DetalleSolicitud.class)),
            headers = @Header(name = "Location", schema = @Schema(type = "string")))
    public ResponseEntity<DetalleSolicitud> crear(
            @AuthenticationPrincipal Jwt token,
            @RequestBody JsonNode entrada,
            @Parameter(required = true, schema = @Schema(type = "string", format = "uuid"))
                    @RequestHeader(value = "Idempotency-Key", required = false)
                    String clave) {
        var creado =
                servicio.crearIdempotente(
                        actor(token),
                        EntradaSolicitud.asunto(entrada),
                        EntradaSolicitud.uuid(clave),
                        UUID.randomUUID());
        return ResponseEntity.created(URI.create("/api/solicitudes/" + creado.id()))
                .body(DetalleSolicitud.de(creado));
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Consultar solicitud visible",
            description =
                    "Unión explícita de permisos: propias SOLICITANTE, asignadas presentadas o finalizadas SUPERVISOR, todas AUDITOR/ADMINISTRADOR. Fotografía del proveedor al presentar y del actor al decidir.")
    @ApiResponse(
            responseCode = "200",
            description = "Detalle de la solicitud visible",
            content = @Content(schema = @Schema(implementation = DetalleSolicitud.class)))
    public DetalleSolicitud consultar(@AuthenticationPrincipal Jwt token, @PathVariable String id) {
        return DetalleSolicitud.de(servicio.consultar(actor(token), EntradaSolicitud.uuid(id)));
    }

    @GetMapping
    @Operation(
            summary = "Listar solicitudes visibles",
            description =
                    "Filtros AND antes de contar/paginar. Asunto contiene literal insensible a mayúsculas, acentos significativos. Fechas inclusivas UTC de creación. Autor solo AUDITOR/ADMINISTRADOR. Desempate id asc. Parámetros desconocidos o repetidos se rechazan.")
    @Parameters({
        @Parameter(
                name = "numero",
                schema = @Schema(type = "string", pattern = "^SOL-[0-9]{4}-[0-9]{6}$")),
        @Parameter(name = "asunto", schema = @Schema(type = "string", maxLength = 160)),
        @Parameter(
                name = "estado",
                schema =
                        @Schema(
                                type = "string",
                                allowableValues = {
                                    "BORRADOR",
                                    "PRESENTADA",
                                    "APROBADA",
                                    "RECHAZADA"
                                })),
        @Parameter(name = "proveedor", schema = @Schema(type = "string", format = "uuid")),
        @Parameter(name = "autor", schema = @Schema(type = "string", format = "uuid")),
        @Parameter(name = "supervisor", schema = @Schema(type = "string", format = "uuid")),
        @Parameter(name = "fechaDesde", schema = @Schema(type = "string", format = "date")),
        @Parameter(name = "fechaHasta", schema = @Schema(type = "string", format = "date")),
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
                                defaultValue = "20")),
        @Parameter(
                name = "sort",
                schema =
                        @Schema(
                                type = "string",
                                defaultValue = "actualizadoEn,desc",
                                allowableValues = {
                                    "numero,asc",
                                    "numero,desc",
                                    "creadoEn,asc",
                                    "creadoEn,desc",
                                    "actualizadoEn,asc",
                                    "actualizadoEn,desc",
                                    "importeTotal,asc",
                                    "importeTotal,desc"
                                }))
    })
    @ApiResponse(
            responseCode = "200",
            description = "Página de solicitudes visibles",
            useReturnTypeSchema = true)
    public Pagina<ResumenSolicitud> listar(
            @AuthenticationPrincipal Jwt token,
            @Parameter(hidden = true) @RequestParam MultiValueMap<String, String> filtros) {
        var pagina = servicio.listar(actor(token), FiltrosSolicitudes.leer(filtros));
        return new Pagina<>(
                pagina.elementos().stream().map(ResumenSolicitud::de).toList(),
                pagina.pagina(),
                pagina.tamano(),
                pagina.totalElementos(),
                pagina.totalPaginas());
    }

    @PutMapping("/{id}")
    @Operation(
            summary = "Reemplazar borrador propio atómicamente",
            description =
                    "SOLICITANTE propietario y X-XSRF-TOKEN; versión esperada. Colección completa de 0–100 conceptos; id null crea línea, UUID existente debe pertenecer a esta solicitud. Decimales como cadenas sin exponente; HALF_UP por línea. Rechaza campos desconocidos.",
            requestBody =
                    @io.swagger.v3.oas.annotations.parameters.RequestBody(
                            required = true,
                            content =
                                    @Content(
                                            schema =
                                                    @Schema(
                                                            implementation =
                                                                    EntradaSolicitud.Borrador
                                                                            .class))))
    @ApiResponse(
            responseCode = "200",
            description = "Borrador reemplazado",
            content = @Content(schema = @Schema(implementation = DetalleSolicitud.class)))
    public DetalleSolicitud guardar(
            @AuthenticationPrincipal Jwt token,
            @PathVariable String id,
            @RequestBody JsonNode entrada) {
        var actor = actor(token);
        var identificador = EntradaSolicitud.uuid(id);
        var peticion = UUID.randomUUID();
        DatosBorrador datos;
        try {
            datos = EntradaSolicitud.borrador(entrada);
        } catch (ErrorSolicitud error) {
            ServicioSolicitudes.rechazo(
                    "GUARDAR_BORRADOR", actor, identificador, error, peticion, null);
            throw error;
        }
        return DetalleSolicitud.de(
                servicio.guardar(
                        actor,
                        identificador,
                        EntradaSolicitud.version(entrada, false),
                        datos,
                        peticion));
    }

    @PostMapping("/{id}/presentar")
    @Operation(
            summary = "Presentar borrador propio",
            description =
                    "SOLICITANTE propietario, X-XSRF-TOKEN e Idempotency-Key UUID. Proveedor activo, supervisor habilitado distinto del autor, 1–100 conceptos y total positivo. Repetición autorizada devuelve el resultado persistido original; clave incompatible409. Sin expiración automática004.",
            requestBody =
                    @io.swagger.v3.oas.annotations.parameters.RequestBody(
                            required = true,
                            content =
                                    @Content(
                                            schema =
                                                    @Schema(
                                                            implementation =
                                                                    EntradaSolicitud.Presentacion
                                                                            .class))))
    @ApiResponse(
            responseCode = "200",
            description = "Solicitud presentada o resultado original recuperado",
            content = @Content(schema = @Schema(implementation = ResultadoPresentacion.class)))
    public ResultadoPresentacion presentar(
            @AuthenticationPrincipal Jwt token,
            @PathVariable String id,
            @RequestBody JsonNode entrada,
            @Parameter(required = true, schema = @Schema(type = "string", format = "uuid"))
                    @RequestHeader(value = "Idempotency-Key", required = false)
                    String clave) {
        return servicio.presentar(
                actor(token),
                EntradaSolicitud.uuid(id),
                EntradaSolicitud.version(entrada, true),
                EntradaSolicitud.uuid(clave),
                UUID.randomUUID());
    }

    @PostMapping("/{id}/aprobar")
    @Operation(
            summary = "Aprobar solicitud presentada",
            description =
                    "SUPERVISOR asignado, habilitado y con rol vigente, distinto del autor; X-XSRF-TOKEN e Idempotency-Key UUID. Comentario opcional hasta500 puntos de código, recorte Unicode y vacío→null. Revalida autorización antes del replay. Estado/version/evento/resultado atómicos.",
            requestBody =
                    @io.swagger.v3.oas.annotations.parameters.RequestBody(
                            required = true,
                            content =
                                    @Content(
                                            schema =
                                                    @Schema(
                                                            implementation =
                                                                    EntradaDecision.Aprobacion
                                                                            .class))))
    @ApiResponse(
            responseCode = "200",
            description = "Solicitud aprobada o resultado original recuperado",
            content = @Content(schema = @Schema(implementation = ResultadoDecision.class)))
    public ResultadoDecision aprobar(
            @AuthenticationPrincipal Jwt token,
            @PathVariable String id,
            @RequestBody JsonNode entrada,
            @Parameter(required = true, schema = @Schema(type = "string", format = "uuid"))
                    @RequestHeader(value = "Idempotency-Key", required = false)
                    String clave) {
        return decidir(token, id, entrada, clave, DatosDecision.Tipo.APROBAR);
    }

    @PostMapping("/{id}/rechazar")
    @Operation(
            summary = "Rechazar solicitud presentada",
            description =
                    "SUPERVISOR asignado, habilitado y con rol vigente, distinto del autor; X-XSRF-TOKEN e Idempotency-Key UUID. Motivo obligatorio de10–1000 puntos de código tras recorte Unicode. El detalle autorizado muestra el motivo; nunca los logs técnicos. Decisión final con evento y resultado persistidos en la misma transacción.",
            requestBody =
                    @io.swagger.v3.oas.annotations.parameters.RequestBody(
                            required = true,
                            content =
                                    @Content(
                                            schema =
                                                    @Schema(
                                                            implementation =
                                                                    EntradaDecision.Rechazo
                                                                            .class))))
    @ApiResponse(
            responseCode = "200",
            description = "Solicitud rechazada o resultado original recuperado",
            content = @Content(schema = @Schema(implementation = ResultadoDecision.class)))
    public ResultadoDecision rechazar(
            @AuthenticationPrincipal Jwt token,
            @PathVariable String id,
            @RequestBody JsonNode entrada,
            @Parameter(required = true, schema = @Schema(type = "string", format = "uuid"))
                    @RequestHeader(value = "Idempotency-Key", required = false)
                    String clave) {
        return decidir(token, id, entrada, clave, DatosDecision.Tipo.RECHAZAR);
    }

    private ResultadoDecision decidir(
            Jwt token, String id, JsonNode entrada, String clave, DatosDecision.Tipo tipo) {
        var actor = actor(token);
        var identificador = EntradaSolicitud.uuid(id);
        var peticion = UUID.randomUUID();
        DatosDecision datos;
        try {
            datos = EntradaDecision.leer(entrada, tipo);
        } catch (ErrorSolicitud error) {
            ServicioSolicitudes.rechazo(tipo.name(), actor, identificador, error, peticion, null);
            throw error;
        }
        return servicio.decidir(
                actor,
                identificador,
                EntradaSolicitud.version(entrada, false),
                EntradaSolicitud.uuid(clave),
                datos,
                peticion);
    }

    public static ActorSolicitud actor(Jwt token) {
        return new ActorSolicitud(
                UUID.fromString(token.getSubject()),
                token.getClaimAsStringList("roles").stream()
                        .map(Rol::valueOf)
                        .collect(Collectors.toSet()));
    }
}
