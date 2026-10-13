package es.gestionsolicitudes.identidad.aplicacion;

import es.gestionsolicitudes.identidad.dominio.*;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface RepositorioIdentidad {
    Optional<Usuario> buscarUsuario(String correo, boolean bloquear);

    Optional<Usuario> buscarUsuario(UUID id);

    void guardarIntentos(UUID id, IntentosAcceso intentos, Instant ahora);

    void crearUsuario(
            UUID id, String correo, String nombre, String hash, Set<Rol> roles, Instant ahora);

    void crearSesion(SesionAcceso sesion);

    void crearToken(TokenRefresco token);

    Optional<TokenRefresco> buscarToken(UUID id);

    Optional<SesionAcceso> bloquearSesion(UUID id);

    void rotar(SesionAcceso sesion, UUID anterior, UUID siguiente, Instant ahora);

    void revocar(SesionAcceso sesion, Instant ahora, String motivo);

    boolean sesionActiva(UUID sesion, UUID usuario, Instant ahora);
}
