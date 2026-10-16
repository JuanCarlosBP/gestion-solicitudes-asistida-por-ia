package es.gestionsolicitudes.identidad.dominio;

import java.util.Set;
import java.util.UUID;

public record UsuarioPublico(UUID id, String correo, String nombreVisible, Set<Rol> roles) {
    public UsuarioPublico {
        roles = Set.copyOf(roles);
    }
}
