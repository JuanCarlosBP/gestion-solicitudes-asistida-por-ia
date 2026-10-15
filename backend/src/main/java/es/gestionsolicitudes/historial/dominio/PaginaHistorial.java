package es.gestionsolicitudes.historial.dominio;

import java.util.List;

public record PaginaHistorial(
        List<EventoHistorial> elementos,
        int pagina,
        int tamano,
        long totalElementos,
        long totalPaginas,
        boolean historiaAnteriorDesconocida) {
    public PaginaHistorial {
        elementos = List.copyOf(elementos);
    }
}
