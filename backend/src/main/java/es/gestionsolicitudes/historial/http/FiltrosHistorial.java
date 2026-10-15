package es.gestionsolicitudes.historial.http;

import es.gestionsolicitudes.historial.dominio.*;
import es.gestionsolicitudes.solicitudes.dominio.ErrorSolicitud;
import es.gestionsolicitudes.solicitudes.http.EntradaSolicitud;
import es.gestionsolicitudes.solicitudes.http.FiltrosSolicitudes;
import java.time.*;
import java.util.*;
import org.springframework.util.MultiValueMap;

public final class FiltrosHistorial {
    private FiltrosHistorial() {}

    public static ConsultaHistorial leer(MultiValueMap<String, String> valores, boolean global) {
        var campos = new HashSet<>(Set.of("page", "size", "accion", "actor", "desde", "hasta"));
        if (global) campos.addAll(Set.of("tipoRecurso", "recursoId"));
        FiltrosSolicitudes.validar(valores, campos);
        try {
            return new ConsultaHistorial(
                    FiltrosSolicitudes.entero(FiltrosSolicitudes.valor(valores, "page", "0")),
                    FiltrosSolicitudes.entero(FiltrosSolicitudes.valor(valores, "size", "20")),
                    valores.containsKey("accion")
                            ? AccionHistorial.valueOf(valores.getFirst("accion"))
                            : null,
                    uuid(valores, "actor"),
                    fecha(valores, "desde"),
                    fecha(valores, "hasta"),
                    valores.containsKey("tipoRecurso")
                            ? TipoRecurso.valueOf(valores.getFirst("tipoRecurso"))
                            : null,
                    uuid(valores, "recursoId"));
        } catch (IllegalArgumentException | DateTimeException error) {
            throw ErrorSolicitud.invalida();
        }
    }

    private static UUID uuid(MultiValueMap<String, String> valores, String nombre) {
        return valores.containsKey(nombre) ? EntradaSolicitud.uuid(valores.getFirst(nombre)) : null;
    }

    private static Instant fecha(MultiValueMap<String, String> valores, String nombre) {
        if (!valores.containsKey(nombre)) return null;
        String valor = valores.getFirst(nombre);
        if (valor == null || valor.length() > 40 || !valor.matches("[0-9]{4}-.+"))
            throw ErrorSolicitud.invalida();
        return OffsetDateTime.parse(valor).toInstant();
    }
}
