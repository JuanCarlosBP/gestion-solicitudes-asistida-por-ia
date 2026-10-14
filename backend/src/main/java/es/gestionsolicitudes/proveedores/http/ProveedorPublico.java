package es.gestionsolicitudes.proveedores.http;

import es.gestionsolicitudes.proveedores.dominio.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ProveedorPublico(
        UUID id,
        TipoProveedor tipo,
        String denominacion,
        String paisFiscal,
        String identificadorFiscal,
        String correoContacto,
        String telefonoContacto,
        boolean activo,
        long version,
        Instant creadoEn,
        Instant actualizadoEn) {
    public static ProveedorPublico de(Proveedor proveedor) {
        var datos = proveedor.datos();
        return new ProveedorPublico(
                proveedor.id(),
                datos.tipo(),
                datos.denominacion(),
                datos.paisFiscal(),
                datos.identificadorFiscal(),
                datos.correoContacto(),
                datos.telefonoContacto(),
                proveedor.activo(),
                proveedor.version(),
                proveedor.creadoEn(),
                proveedor.actualizadoEn());
    }

    public record Pagina(
            List<ProveedorPublico> elementos,
            int pagina,
            int tamano,
            long totalElementos,
            long totalPaginas) {
        public Pagina {
            elementos = List.copyOf(elementos);
        }

        public static Pagina de(PaginaProveedores pagina) {
            return new Pagina(
                    pagina.elementos().stream().map(ProveedorPublico::de).toList(),
                    pagina.pagina(),
                    pagina.tamano(),
                    pagina.totalElementos(),
                    pagina.totalPaginas());
        }
    }
}
