package es.gestionsolicitudes.proveedores.http;

import es.gestionsolicitudes.proveedores.dominio.*;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Set;
import tools.jackson.databind.JsonNode;

/** Esquemas públicos y lectura estricta sin coerción de escalares ni asignación masiva. */
public final class EntradaProveedor {
    private EntradaProveedor() {}

    private static final Set<String> EDITABLES =
            Set.of(
                    "tipo",
                    "denominacion",
                    "paisFiscal",
                    "identificadorFiscal",
                    "correoContacto",
                    "telefonoContacto");

    @Schema(
            additionalProperties = Schema.AdditionalPropertiesValue.FALSE,
            requiredProperties = {"tipo", "denominacion", "paisFiscal", "identificadorFiscal"})
    public record Alta(
            TipoProveedor tipo,
            @Schema(minLength = 1, maxLength = 160) String denominacion,
            @Schema(minLength = 2, maxLength = 2) String paisFiscal,
            @Schema(minLength = 3, maxLength = 64) String identificadorFiscal,
            @Schema(maxLength = 254, format = "email") String correoContacto,
            @Schema(maxLength = 32) String telefonoContacto) {}

    @Schema(
            additionalProperties = Schema.AdditionalPropertiesValue.FALSE,
            requiredProperties = {
                "tipo",
                "denominacion",
                "paisFiscal",
                "identificadorFiscal",
                "version"
            })
    public record Edicion(
            TipoProveedor tipo,
            @Schema(minLength = 1, maxLength = 160) String denominacion,
            @Schema(minLength = 2, maxLength = 2) String paisFiscal,
            @Schema(minLength = 3, maxLength = 64) String identificadorFiscal,
            @Schema(maxLength = 254, format = "email") String correoContacto,
            @Schema(maxLength = 32) String telefonoContacto,
            @Schema(minimum = "0") Long version) {}

    @Schema(
            additionalProperties = Schema.AdditionalPropertiesValue.FALSE,
            requiredProperties = {"version"})
    public record Estado(@Schema(minimum = "0") Long version) {}

    public static DatosProveedor datos(JsonNode entrada, boolean edicion) {
        Set<String> permitidos = new java.util.HashSet<>(EDITABLES);
        if (edicion) permitidos.add("version");
        comprobarCampos(entrada, permitidos);
        TipoProveedor tipo;
        try {
            tipo = TipoProveedor.valueOf(texto(entrada, "tipo", true));
        } catch (IllegalArgumentException error) {
            throw ErrorProveedor.invalido();
        }
        return new DatosProveedor(
                tipo,
                texto(entrada, "denominacion", true),
                texto(entrada, "paisFiscal", true),
                texto(entrada, "identificadorFiscal", true),
                texto(entrada, "correoContacto", false),
                texto(entrada, "telefonoContacto", false));
    }

    public static long version(JsonNode entrada, boolean soloEstado) {
        if (soloEstado) comprobarCampos(entrada, Set.of("version"));
        JsonNode valor = entrada.get("version");
        if (valor == null
                || !valor.isIntegralNumber()
                || !valor.canConvertToLong()
                || valor.asLong() < 0) throw ErrorProveedor.invalido();
        return valor.asLong();
    }

    private static String texto(JsonNode entrada, String campo, boolean obligatorio) {
        JsonNode valor = entrada.get(campo);
        if (valor == null || valor.isNull()) {
            if (obligatorio) throw ErrorProveedor.invalido();
            return null;
        }
        if (!valor.isString()) throw ErrorProveedor.invalido();
        return valor.asString();
    }

    private static void comprobarCampos(JsonNode entrada, Set<String> permitidos) {
        if (entrada == null || !entrada.isObject()) throw ErrorProveedor.invalido();
        for (var propiedad : entrada.properties()) {
            if (!permitidos.contains(propiedad.getKey())) throw ErrorProveedor.invalido();
        }
    }
}
