package es.gestionsolicitudes.solicitudes.http;

import es.gestionsolicitudes.solicitudes.dominio.*;
import java.time.LocalDate;
import java.util.*;
import org.springframework.util.MultiValueMap;

public final class FiltrosSolicitudes {
    private FiltrosSolicitudes() {}

    public static ConsultaSolicitudes leer(MultiValueMap<String, String> valores) {
        validar(
                valores,
                Set.of(
                        "numero",
                        "asunto",
                        "estado",
                        "proveedor",
                        "autor",
                        "supervisor",
                        "fechaDesde",
                        "fechaHasta",
                        "page",
                        "size",
                        "sort"));
        String[] orden = valor(valores, "sort", "actualizadoEn,desc").split(",", -1);
        if (orden.length != 2 || !(orden[1].equals("asc") || orden[1].equals("desc")))
            throw ErrorSolicitud.invalida();
        var campo =
                switch (orden[0]) {
                    case "numero" -> ConsultaSolicitudes.Orden.NUMERO;
                    case "creadoEn" -> ConsultaSolicitudes.Orden.CREADO_EN;
                    case "actualizadoEn" -> ConsultaSolicitudes.Orden.ACTUALIZADO_EN;
                    case "importeTotal" -> ConsultaSolicitudes.Orden.IMPORTE_TOTAL;
                    default -> throw ErrorSolicitud.invalida();
                };
        return new ConsultaSolicitudes(
                valores.getFirst("numero"),
                valores.getFirst("asunto"),
                valores.getFirst("estado"),
                uuid(valores, "proveedor"),
                uuid(valores, "autor"),
                uuid(valores, "supervisor"),
                fecha(valores, "fechaDesde"),
                fecha(valores, "fechaHasta"),
                entero(valor(valores, "page", "0")),
                entero(valor(valores, "size", "20")),
                campo,
                orden[1].equals("desc"));
    }

    public static void validar(MultiValueMap<String, String> valores, Set<String> campos) {
        if (!campos.containsAll(valores.keySet())
                || valores.values().stream().anyMatch(v -> v.size() != 1))
            throw ErrorSolicitud.invalida();
    }

    public static String valor(
            MultiValueMap<String, String> valores, String campo, String defecto) {
        return valores.containsKey(campo) ? valores.getFirst(campo) : defecto;
    }

    public static int entero(String valor) {
        try {
            if (valor == null || !valor.matches("[0-9]{1,9}")) throw ErrorSolicitud.invalida();
            return Integer.parseInt(valor);
        } catch (NumberFormatException error) {
            throw ErrorSolicitud.invalida();
        }
    }

    private static UUID uuid(MultiValueMap<String, String> valores, String campo) {
        return valores.containsKey(campo) ? EntradaSolicitud.uuid(valores.getFirst(campo)) : null;
    }

    private static LocalDate fecha(MultiValueMap<String, String> valores, String campo) {
        if (!valores.containsKey(campo)) return null;
        try {
            String texto = valores.getFirst(campo);
            if (texto == null || !texto.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}"))
                throw ErrorSolicitud.invalida();
            return LocalDate.parse(texto);
        } catch (java.time.DateTimeException error) {
            throw ErrorSolicitud.invalida();
        }
    }
}
