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

    void bloquearClave(UUID usuario, UUID clave);

    record Operacion(
            String tipo,
            String huella,
            ResultadoPresentacion presentacion,
            ResultadoDecision decision) {}

    Optional<Operacion> operacion(UUID usuario, UUID clave);

    void presentar(Solicitud solicitud, Solicitud.Proveedor proveedor, Instant ahora);

    void registrar(UUID usuario, UUID clave, String huella, ResultadoPresentacion resultado);

    void decidir(
            Solicitud solicitud,
            DatosDecision datos,
            Solicitud.Persona actor,
            Instant ahora,
            UUID peticion);

    void registrarDecision(
            UUID usuario,
            UUID clave,
            String huella,
            DatosDecision.Tipo tipo,
            ResultadoDecision resultado,
            Solicitud anterior);
}
