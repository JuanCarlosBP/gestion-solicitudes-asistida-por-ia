package es.gestionsolicitudes.solicitudes.dominio;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

public record Concepto(
        UUID id,
        String descripcion,
        BigDecimal cantidad,
        Unidad unidad,
        BigDecimal precioUnitario,
        BigDecimal importeLinea,
        int posicion) {
    public enum Unidad {
        UNIDAD,
        HORA,
        DIA,
        MES,
        KILOGRAMO,
        LITRO,
        METRO,
        SERVICIO
    }

    public static final BigDecimal MAX_TOTAL = new BigDecimal("9999999999999.99");

    public Concepto {
        descripcion = DatosBorrador.texto(descripcion, 1, 300);
        if (id == null || unidad == null || posicion <= 0) throw ErrorSolicitud.invalida();
        cantidad = decimal(cantidad, 3, new BigDecimal("999999999999.999"));
        precioUnitario = decimal(precioUnitario, 4, new BigDecimal("99999999999.9999"));
        BigDecimal calculado = cantidad.multiply(precioUnitario).setScale(2, RoundingMode.HALF_UP);
        // Al rehidratar, detectar una persistencia incoherente; el importe siempre se recalcula.
        if (importeLinea != null && importeLinea.compareTo(calculado) != 0)
            throw ErrorSolicitud.invalida();
        importeLinea = calculado;
        if (importeLinea.compareTo(MAX_TOTAL) > 0) throw ErrorSolicitud.invalida();
    }

    private static BigDecimal decimal(BigDecimal valor, int escala, BigDecimal maximo) {
        if (valor == null
                || valor.signum() <= 0
                || valor.scale() > escala
                || valor.precision() > 15
                || valor.compareTo(maximo) > 0) throw ErrorSolicitud.invalida();
        return valor.setScale(escala);
    }
}
