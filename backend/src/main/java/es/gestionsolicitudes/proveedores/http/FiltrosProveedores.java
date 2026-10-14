package es.gestionsolicitudes.proveedores.http;

import es.gestionsolicitudes.proveedores.dominio.*;
import java.util.Set;
import org.springframework.util.MultiValueMap;

public final class FiltrosProveedores {
    private FiltrosProveedores() {}

    private static final Set<String> CAMPOS =
            Set.of(
                    "denominacion",
                    "identificadorFiscal",
                    "tipo",
                    "paisFiscal",
                    "activo",
                    "page",
                    "size",
                    "sort");

    public static ConsultaProveedores leer(MultiValueMap<String, String> valores) {
        if (!CAMPOS.containsAll(valores.keySet())
                || valores.values().stream().anyMatch(lista -> lista.size() != 1))
            throw ErrorProveedor.invalido();
        try {
            String orden = valor(valores, "sort", "denominacion,asc");
            String[] partes = orden.split(",", -1);
            if (partes.length != 2 || !(partes[1].equals("asc") || partes[1].equals("desc")))
                throw ErrorProveedor.invalido();
            var campo =
                    switch (partes[0]) {
                        case "denominacion" -> ConsultaProveedores.Orden.DENOMINACION;
                        case "creadoEn" -> ConsultaProveedores.Orden.CREADO_EN;
                        case "actualizadoEn" -> ConsultaProveedores.Orden.ACTUALIZADO_EN;
                        default -> throw ErrorProveedor.invalido();
                    };
            Boolean activo =
                    switch (valor(valores, "activo", "true")) {
                        case "true" -> Boolean.TRUE;
                        case "false" -> Boolean.FALSE;
                        case "todos" -> null;
                        default -> throw ErrorProveedor.invalido();
                    };
            String tipo = valores.getFirst("tipo");
            return new ConsultaProveedores(
                    valores.getFirst("denominacion"),
                    valores.getFirst("identificadorFiscal"),
                    tipo == null ? null : TipoProveedor.valueOf(tipo),
                    valores.getFirst("paisFiscal"),
                    activo,
                    entero(valor(valores, "page", "0")),
                    entero(valor(valores, "size", "20")),
                    campo,
                    partes[1].equals("desc"));
        } catch (IllegalArgumentException error) {
            throw ErrorProveedor.invalido();
        }
    }

    private static String valor(
            MultiValueMap<String, String> valores, String campo, String defecto) {
        return valores.containsKey(campo) ? valores.getFirst(campo) : defecto;
    }

    private static int entero(String valor) {
        if (valor == null || !valor.matches("[0-9]{1,10}")) throw ErrorProveedor.invalido();
        return Integer.parseInt(valor);
    }
}
