package es.gestionsolicitudes.solicitudes.aplicacion;

import es.gestionsolicitudes.solicitudes.dominio.*;
import java.time.Instant;
import java.util.*;

public interface RepositorioSolicitudes {
    long siguienteNumero();

    void crear(UUID id, String numero, UUID autor, String asunto, Instant ahora);

    Optional<Solicitud> buscar(UUID id, boolean bloquear, boolean conceptos);

    void guardar(UUID id, long version, DatosBorrador datos, Instant ahora);

    Optional<Solicitud.Proveedor> proveedor(UUID id, boolean bloquear);

    boolean supervisor(UUID id, boolean bloquear);

    Optional<Solicitud.Persona> supervisorVigente(UUID id);

    Pagina<Solicitud.Persona> supervisores(UUID actor, String nombre, int pagina, int tamano);

    Pagina<Solicitud> listar(ActorSolicitud actor, ConsultaSolicitudes consulta);

    void presentar(Solicitud solicitud, Solicitud.Proveedor proveedor, Instant ahora);

    void decidir(
            Solicitud solicitud,
            DatosDecision datos,
            Solicitud.Persona actor,
            Instant ahora,
            UUID peticion);
}
