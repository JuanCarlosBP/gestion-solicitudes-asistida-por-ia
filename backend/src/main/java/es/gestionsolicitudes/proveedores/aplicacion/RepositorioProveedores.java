package es.gestionsolicitudes.proveedores.aplicacion;

import es.gestionsolicitudes.proveedores.dominio.*;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface RepositorioProveedores {
    void insertar(Proveedor proveedor);

    Optional<Proveedor> buscar(UUID id, boolean bloquear);

    PaginaProveedores listar(ConsultaProveedores consulta);

    Optional<Proveedor> modificar(UUID id, long version, DatosProveedor datos, Instant ahora);

    Optional<Proveedor> cambiarEstado(UUID id, long version, boolean activo, Instant ahora);
}
