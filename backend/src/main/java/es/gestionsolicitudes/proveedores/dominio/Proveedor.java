package es.gestionsolicitudes.proveedores.dominio;

import java.time.Instant;
import java.util.UUID;

public record Proveedor(
        UUID id,
        DatosProveedor datos,
        boolean activo,
        long version,
        Instant creadoEn,
        Instant actualizadoEn) {
    public void exigirVersion(long conocida) {
        if (conocida < 0) throw ErrorProveedor.invalido();
        if (conocida != version) throw new ErrorProveedor(ErrorProveedor.Codigo.VERSION_OBSOLETA);
    }
}
