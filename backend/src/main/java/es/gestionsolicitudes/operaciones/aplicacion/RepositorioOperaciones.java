package es.gestionsolicitudes.operaciones.aplicacion;

import es.gestionsolicitudes.identidad.dominio.Rol;
import es.gestionsolicitudes.operaciones.dominio.*;
import java.time.Instant;
import java.util.*;

public interface RepositorioOperaciones {
    record Confirmada(
            TipoOperacion tipo,
            UUID recurso,
            String huella,
            int versionHuella,
            EstadoOperacion.Resultado resumen,
            Object resultado) {
        public EstadoOperacion estado() {
            return new EstadoOperacion("COMPLETADA", tipo, recurso, resumen);
        }
    }

    boolean intentarBloqueo(UUID usuario, UUID clave);

    Set<Rol> roles(UUID usuario, boolean bloquear);

    boolean existeProveedor(UUID id);

    Optional<Confirmada> buscar(UUID usuario, UUID clave);

    void guardar(PeticionOperacion peticion, Object resultado, Instant ahora);
}
