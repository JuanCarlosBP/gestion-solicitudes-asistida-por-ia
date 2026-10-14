package es.gestionsolicitudes.proveedores.dominio;

import es.gestionsolicitudes.identidad.dominio.Rol;
import java.util.Set;
import java.util.UUID;

public record ActorProveedor(UUID id, Set<Rol> roles) {
    public ActorProveedor {
        roles = Set.copyOf(roles);
    }

    public void exigirLectura() {
        if (roles.isEmpty()) denegar();
    }

    public void exigirEscritura() {
        if (!roles.contains(Rol.ADMINISTRADOR)) denegar();
    }

    public boolean puedeVerInactivos() {
        return roles.contains(Rol.AUDITOR) || roles.contains(Rol.ADMINISTRADOR);
    }

    public void exigirInactivos() {
        if (!puedeVerInactivos()) denegar();
    }

    private static void denegar() {
        throw new ErrorProveedor(ErrorProveedor.Codigo.ACCESO_NO_PERMITIDO);
    }
}
