package es.gestionsolicitudes.proveedores.dominio;

import java.util.List;

public record PaginaProveedores(
        List<Proveedor> elementos, int pagina, int tamano, long totalElementos, long totalPaginas) {
    public PaginaProveedores {
        elementos = List.copyOf(elementos);
    }
}
