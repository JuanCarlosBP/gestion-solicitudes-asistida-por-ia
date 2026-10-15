package es.gestionsolicitudes.solicitudes.dominio;

import java.util.List;

public record Pagina<T>(
        List<T> elementos, int pagina, int tamano, long totalElementos, long totalPaginas) {
    public Pagina {
        elementos = List.copyOf(elementos);
    }
}
