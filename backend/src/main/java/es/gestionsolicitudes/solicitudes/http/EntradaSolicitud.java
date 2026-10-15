package es.gestionsolicitudes.solicitudes.http;

import es.gestionsolicitudes.solicitudes.dominio.*;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.*;
import tools.jackson.databind.JsonNode;

public final class EntradaSolicitud {
    private EntradaSolicitud() {}

    @Schema(
            name = "AltaSolicitud",
            additionalProperties = Schema.AdditionalPropertiesValue.FALSE,
            requiredProperties = {"asunto"})
    public record Alta(@Schema(minLength = 3, maxLength = 160) String asunto) {}

    @Schema(
            name = "BorradorSolicitud",
            additionalProperties = Schema.AdditionalPropertiesValue.FALSE,
            requiredProperties = {
                "asunto",
                "descripcion",
                "proveedorId",
                "supervisorId",
                "version",
                "conceptos"
            })
    public record Borrador(
            @Schema(minLength = 3, maxLength = 160) String asunto,
            @Schema(maxLength = 2000, nullable = true) String descripcion,
            @Schema(nullable = true) UUID proveedorId,
            @Schema(nullable = true) UUID supervisorId,
            @Schema(minimum = "0") long version,
            @io.swagger.v3.oas.annotations.media.ArraySchema(maxItems = 100)
                    List<Linea> conceptos) {
        public Borrador {
            conceptos = List.copyOf(conceptos);
        }
    }

    @Schema(
            name = "EntradaConceptoSolicitud",
            additionalProperties = Schema.AdditionalPropertiesValue.FALSE,
            requiredProperties = {
                "id",
                "descripcion",
                "cantidad",
                "unidad",
                "precioUnitario",
                "posicion"
            })
    public record Linea(
            @Schema(nullable = true) UUID id,
            @Schema(minLength = 1, maxLength = 300) String descripcion,
            @Schema(pattern = "^[0-9]{1,12}(\\.[0-9]{1,3})?$") String cantidad,
            Concepto.Unidad unidad,
            @Schema(pattern = "^[0-9]{1,11}(\\.[0-9]{1,4})?$") String precioUnitario,
            @Schema(minimum = "1") int posicion) {}

    @Schema(
            name = "EntradaPresentacionSolicitud",
            additionalProperties = Schema.AdditionalPropertiesValue.FALSE,
            requiredProperties = {"version"})
    public record Presentacion(@Schema(minimum = "0") long version) {}

    public static String asunto(JsonNode nodo) {
        campos(nodo, Set.of("asunto"));
        return DatosBorrador.texto(texto(nodo, "asunto", false), 3, 160);
    }

    public static long version(JsonNode nodo, boolean presentar) {
        if (presentar) campos(nodo, Set.of("version"));
        JsonNode valor = nodo.get("version");
        if (valor == null
                || !valor.isIntegralNumber()
                || !valor.canConvertToLong()
                || valor.asLong() < 0) throw ErrorSolicitud.invalida();
        return valor.asLong();
    }

    public static DatosBorrador borrador(JsonNode nodo) {
        campos(
                nodo,
                Set.of(
                        "asunto",
                        "descripcion",
                        "proveedorId",
                        "supervisorId",
                        "version",
                        "conceptos"));
        version(nodo, false);
        JsonNode lineas = nodo.get("conceptos");
        if (!lineas.isArray() || lineas.size() > 100) throw ErrorSolicitud.invalida();
        List<Concepto> conceptos = new ArrayList<>();
        Set<UUID> existentes = new HashSet<>();
        for (JsonNode linea : lineas) {
            campos(
                    linea,
                    Set.of(
                            "id",
                            "descripcion",
                            "cantidad",
                            "unidad",
                            "precioUnitario",
                            "posicion"));
            UUID id = opcional(linea, "id");
            if (id != null) existentes.add(id);
            else id = UUID.randomUUID();
            JsonNode posicion = linea.get("posicion");
            if (!posicion.isIntegralNumber() || !posicion.canConvertToInt())
                throw ErrorSolicitud.invalida();
            try {
                conceptos.add(
                        new Concepto(
                                id,
                                texto(linea, "descripcion", false),
                                decimal(linea, "cantidad", 12, 3),
                                Concepto.Unidad.valueOf(texto(linea, "unidad", false)),
                                decimal(linea, "precioUnitario", 11, 4),
                                null,
                                posicion.asInt()));
            } catch (IllegalArgumentException error) {
                throw ErrorSolicitud.invalida();
            }
        }
        return new DatosBorrador(
                texto(nodo, "asunto", false),
                texto(nodo, "descripcion", true),
                opcional(nodo, "proveedorId"),
                opcional(nodo, "supervisorId"),
                conceptos,
                existentes);
    }

    private static BigDecimal decimal(JsonNode nodo, String campo, int enteros, int escala) {
        String texto = texto(nodo, campo, false);
        if (!texto.matches("[0-9]{1," + enteros + "}(\\.[0-9]{1," + escala + "})?"))
            throw ErrorSolicitud.invalida();
        return new BigDecimal(texto);
    }

    private static String texto(JsonNode nodo, String campo, boolean nullable) {
        JsonNode valor = nodo.get(campo);
        if (nullable && valor != null && valor.isNull()) return null;
        if (valor == null || !valor.isString()) throw ErrorSolicitud.invalida();
        return valor.asString();
    }

    public static UUID uuid(String valor) {
        if (valor == null) throw ErrorSolicitud.invalida();
        try {
            UUID id = UUID.fromString(valor);
            if (!id.toString().equalsIgnoreCase(valor)) throw ErrorSolicitud.invalida();
            return id;
        } catch (IllegalArgumentException error) {
            throw ErrorSolicitud.invalida();
        }
    }

    private static UUID opcional(JsonNode nodo, String campo) {
        String valor = texto(nodo, campo, true);
        return valor == null ? null : uuid(valor);
    }

    private static void campos(JsonNode nodo, Set<String> campos) {
        if (nodo == null || !nodo.isObject() || !nodo.propertyNames().equals(campos))
            throw ErrorSolicitud.invalida();
    }
}
