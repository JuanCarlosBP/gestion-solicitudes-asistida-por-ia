package es.gestionsolicitudes.proveedores.http;

import es.gestionsolicitudes.identidad.dominio.Rol;
import es.gestionsolicitudes.proveedores.aplicacion.ServicioProveedores;
import es.gestionsolicitudes.proveedores.dominio.*;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.net.URI;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/proveedores")
@SecurityRequirement(name = "BearerAuth")
@ApiResponses({
    @ApiResponse(responseCode = "400", description = "SOLICITUD_INVALIDA"),
    @ApiResponse(responseCode = "401", description = "NO_AUTENTICADO"),
    @ApiResponse(responseCode = "403", description = "ACCESO_NO_PERMITIDO"),
    @ApiResponse(responseCode = "404", description = "PROVEEDOR_NO_ENCONTRADO"),
    @ApiResponse(responseCode = "409", description = "PROVEEDOR_DUPLICADO o VERSION_OBSOLETA"),
    @ApiResponse(responseCode = "500", description = "ERROR_INTERNO"),
    @ApiResponse(responseCode = "503", description = "DEPENDENCIA_NO_DISPONIBLE")
})
public class ControladorProveedores {
    private final ServicioProveedores servicio;

    public ControladorProveedores(ServicioProveedores servicio) {
        this.servicio = servicio;
    }

    @PostMapping
    @Operation(
            summary = "Crear proveedor",
            description =
                    "ADMINISTRADOR; exige cookie XSRF y cabecera X-XSRF-TOKEN. El país debe ser ISO alpha-2 mayúsculo; la clave fiscal se normaliza mediante NFKC/ROOT/espacios. No admite campos internos.",
            requestBody =
                    @io.swagger.v3.oas.annotations.parameters.RequestBody(
                            required = true,
                            content =
                                    @Content(
                                            schema =
                                                    @Schema(
                                                            implementation =
                                                                    EntradaProveedor.Alta.class))))
    @ApiResponse(
            responseCode = "201",
            description = "Proveedor creado",
            content = @Content(schema = @Schema(implementation = ProveedorPublico.class)),
            headers =
                    @Header(
                            name = "Location",
                            description = "URI del proveedor",
                            schema = @Schema(type = "string")))
    public ResponseEntity<ProveedorPublico> crear(
            @AuthenticationPrincipal Jwt token, @RequestBody JsonNode entrada) {
        var proveedor = servicio.crear(actor(token), EntradaProveedor.datos(entrada, false));
        return ResponseEntity.created(URI.create("/api/proveedores/" + proveedor.id()))
                .body(ProveedorPublico.de(proveedor));
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Consultar proveedor",
            description =
                    "Inactivos visibles solo a AUDITOR o ADMINISTRADOR; inexistente y no visible devuelven 404.")
    public ProveedorPublico consultar(@AuthenticationPrincipal Jwt token, @PathVariable String id) {
        return ProveedorPublico.de(servicio.consultar(actor(token), uuid(id)));
    }

    @GetMapping
    @Operation(
            summary = "Buscar proveedores",
            description =
                    "Filtros AND. Denominación contiene literal, insensible a mayúsculas y con acentos significativos. Fiscal exacto normalizado. Orden estable con id asc. activo false/todos requiere AUDITOR o ADMINISTRADOR.")
    @Parameters({
        @Parameter(
                name = "denominacion",
                description = "Contiene literal; %, _ y escape son texto",
                schema = @Schema(type = "string", maxLength = 128)),
        @Parameter(
                name = "identificadorFiscal",
                description = "Exacto tras normalización fiscal",
                schema = @Schema(type = "string", minLength = 3, maxLength = 64)),
        @Parameter(name = "tipo", schema = @Schema(implementation = TipoProveedor.class)),
        @Parameter(
                name = "paisFiscal",
                schema = @Schema(type = "string", minLength = 2, maxLength = 2)),
        @Parameter(
                name = "activo",
                schema =
                        @Schema(
                                type = "string",
                                allowableValues = {"true", "false", "todos"},
                                defaultValue = "true")),
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
                                allowableValues = {
                                    "denominacion,asc",
                                    "denominacion,desc",
                                    "creadoEn,asc",
                                    "creadoEn,desc",
                                    "actualizadoEn,asc",
                                    "actualizadoEn,desc"
                                },
                                defaultValue = "denominacion,asc"))
    })
    public ProveedorPublico.Pagina listar(
            @AuthenticationPrincipal Jwt token,
            @Parameter(hidden = true) @RequestParam MultiValueMap<String, String> filtros) {
        return ProveedorPublico.Pagina.de(
                servicio.listar(actor(token), FiltrosProveedores.leer(filtros)));
    }

    @PutMapping("/{id}")
    @Operation(
            summary = "Modificar proveedor",
            description =
                    "ADMINISTRADOR y X-XSRF-TOKEN. PUT preserva id, activo y creadoEn. La versión conocida es obligatoria; conflicto no sobrescribe.",
            requestBody =
                    @io.swagger.v3.oas.annotations.parameters.RequestBody(
                            required = true,
                            content =
                                    @Content(
                                            schema =
                                                    @Schema(
                                                            implementation =
                                                                    EntradaProveedor.Edicion
                                                                            .class))))
    public ProveedorPublico modificar(
            @AuthenticationPrincipal Jwt token,
            @PathVariable String id,
            @RequestBody JsonNode entrada) {
        var datos = EntradaProveedor.datos(entrada, true);
        return ProveedorPublico.de(
                servicio.modificar(
                        actor(token), uuid(id), EntradaProveedor.version(entrada, false), datos));
    }

    @PostMapping("/{id}/desactivar")
    @Operation(
            summary = "Desactivar proveedor",
            description =
                    "ADMINISTRADOR y X-XSRF-TOKEN. Repetición con versión vigente sin efecto; obsoleta devuelve 409.",
            requestBody =
                    @io.swagger.v3.oas.annotations.parameters.RequestBody(
                            required = true,
                            content =
                                    @Content(
                                            schema =
                                                    @Schema(
                                                            implementation =
                                                                    EntradaProveedor.Estado
                                                                            .class))))
    public ProveedorPublico desactivar(
            @AuthenticationPrincipal Jwt token,
            @PathVariable String id,
            @RequestBody JsonNode entrada) {
        return estado(token, id, entrada, false);
    }

    @PostMapping("/{id}/reactivar")
    @Operation(
            summary = "Reactivar proveedor",
            description =
                    "ADMINISTRADOR y X-XSRF-TOKEN. Repetición con versión vigente sin efecto; obsoleta devuelve 409.",
            requestBody =
                    @io.swagger.v3.oas.annotations.parameters.RequestBody(
                            required = true,
                            content =
                                    @Content(
                                            schema =
                                                    @Schema(
                                                            implementation =
                                                                    EntradaProveedor.Estado
                                                                            .class))))
    public ProveedorPublico reactivar(
            @AuthenticationPrincipal Jwt token,
            @PathVariable String id,
            @RequestBody JsonNode entrada) {
        return estado(token, id, entrada, true);
    }

    private ProveedorPublico estado(Jwt token, String id, JsonNode entrada, boolean activo) {
        return ProveedorPublico.de(
                servicio.cambiarEstado(
                        actor(token), uuid(id), EntradaProveedor.version(entrada, true), activo));
    }

    private static ActorProveedor actor(Jwt token) {
        return new ActorProveedor(
                UUID.fromString(token.getSubject()),
                token.getClaimAsStringList("roles").stream()
                        .map(Rol::valueOf)
                        .collect(Collectors.toSet()));
    }

    private static UUID uuid(String valor) {
        try {
            UUID id = UUID.fromString(valor);
            if (!id.toString().equalsIgnoreCase(valor)) throw ErrorProveedor.invalido();
            return id;
        } catch (IllegalArgumentException error) {
            throw ErrorProveedor.invalido();
        }
    }
}
