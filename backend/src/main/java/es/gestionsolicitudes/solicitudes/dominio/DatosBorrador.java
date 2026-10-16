package es.gestionsolicitudes.solicitudes.dominio;

import java.math.BigDecimal;
import java.util.*;

public record DatosBorrador(
        String asunto,
        String descripcion,
        UUID proveedorId,
        UUID supervisorId,
        List<Concepto> conceptos,
        Set<UUID> idsExistentes) {
    public DatosBorrador {
        asunto = texto(asunto, 3, 160);
        descripcion = descripcion == null ? null : texto(descripcion, 0, 2000);
        if (conceptos == null || conceptos.size() > 100 || idsExistentes == null)
            throw ErrorSolicitud.invalida();
        conceptos = List.copyOf(conceptos);
        idsExistentes = Set.copyOf(idsExistentes);
        Set<UUID> ids = new HashSet<>();
        Set<Integer> posiciones = new HashSet<>();
        BigDecimal total = BigDecimal.ZERO;
        for (Concepto concepto : conceptos) {
            if (!ids.add(concepto.id()) || !posiciones.add(concepto.posicion()))
                throw ErrorSolicitud.invalida();
            total = total.add(concepto.importeLinea());
        }
        if (total.compareTo(Concepto.MAX_TOTAL) > 0 || !ids.containsAll(idsExistentes))
            throw ErrorSolicitud.invalida();
    }

    public BigDecimal total() {
        return conceptos.stream()
                .map(Concepto::importeLinea)
                .reduce(new BigDecimal("0.00"), BigDecimal::add);
    }

    public static String texto(String valor, int minimo, int maximo) {
        if (valor == null) throw ErrorSolicitud.invalida();
        int inicio = 0;
        int fin = valor.length();
        while (inicio < fin && espacio(valor.codePointAt(inicio)))
            inicio += Character.charCount(valor.codePointAt(inicio));
        while (fin > inicio && espacio(valor.codePointBefore(fin)))
            fin -= Character.charCount(valor.codePointBefore(fin));
        String limpio = valor.substring(inicio, fin);
        int longitud = limpio.codePointCount(0, limpio.length());
        if (longitud < minimo || longitud > maximo) throw ErrorSolicitud.invalida();
        // PostgreSQL no admite NUL ni secuencias UTF-16 incompletas.
        for (int i = 0; i < limpio.length(); i++) {
            char caracter = limpio.charAt(i);
            if (caracter == 0 || Character.isLowSurrogate(caracter))
                throw ErrorSolicitud.invalida();
            if (Character.isHighSurrogate(caracter)
                    && (++i >= limpio.length() || !Character.isLowSurrogate(limpio.charAt(i))))
                throw ErrorSolicitud.invalida();
        }
        return limpio;
    }

    private static boolean espacio(int caracter) {
        return Character.isWhitespace(caracter)
                || Character.isSpaceChar(caracter)
                || caracter == 0x85;
    }
}
