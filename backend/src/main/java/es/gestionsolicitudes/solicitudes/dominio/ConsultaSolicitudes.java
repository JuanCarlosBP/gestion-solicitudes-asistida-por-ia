package es.gestionsolicitudes.solicitudes.dominio;

import java.time.LocalDate;
import java.util.UUID;

public record ConsultaSolicitudes(
        String numero,
        String asunto,
        String estado,
        UUID proveedor,
        UUID autor,
        UUID supervisor,
        LocalDate fechaDesde,
        LocalDate fechaHasta,
        int pagina,
        int tamano,
        Orden orden,
        boolean descendente) {
    public enum Orden {
        NUMERO,
        CREADO_EN,
        ACTUALIZADO_EN,
        IMPORTE_TOTAL
    }

    public ConsultaSolicitudes {
        if (numero != null && !numero.matches("SOL-[0-9]{4}-[0-9]{6}"))
            throw ErrorSolicitud.invalida();
        if (asunto != null) asunto = DatosBorrador.texto(asunto, 0, 160);
        if (estado != null
                && !java.util.Set.of("BORRADOR", "PRESENTADA", "APROBADA", "RECHAZADA")
                        .contains(estado)) throw ErrorSolicitud.invalida();
        if (fechaDesde != null && fechaHasta != null && fechaDesde.isAfter(fechaHasta))
            throw ErrorSolicitud.invalida();
        paginacion(pagina, tamano);
        if (orden == null) throw ErrorSolicitud.invalida();
    }

    public static void paginacion(int pagina, int tamano) {
        if (pagina < 0 || tamano < 1 || tamano > 100 || (long) pagina * tamano > 100000)
            throw ErrorSolicitud.invalida();
    }
}
