package es.gestionsolicitudes.operaciones.aplicacion;

import es.gestionsolicitudes.operaciones.dominio.*;
import java.time.Clock;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.LockSupport;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.*;

@Service
public class ServicioOperaciones {
    private static final long ESPERA = TimeUnit.SECONDS.toNanos(3);

    private record Clave(String ambito, UUID usuario, UUID clave) {}

    // Solo metadatos: jamás conserva cuerpos, resultados, claves de acceso o textos.
    private record EnCurso(
            TipoOperacion tipo,
            UUID recurso,
            CountDownLatch fin,
            AtomicBoolean cierreTransaccional) {}

    private record Terminada<R>(R resultado) {}

    private final ConcurrentHashMap<Clave, EnCurso> enCurso = new ConcurrentHashMap<>();
    private final AtomicInteger esperas = new AtomicInteger();
    private final RepositorioOperaciones repositorio;
    private final AutorizacionOperaciones autorizacion;
    private final TransactionTemplate transaccion;
    private final Clock reloj;

    public ServicioOperaciones(
            RepositorioOperaciones repositorio,
            AutorizacionOperaciones autorizacion,
            PlatformTransactionManager gestor,
            Clock reloj) {
        this.repositorio = repositorio;
        this.autorizacion = autorizacion;
        this.reloj = reloj;
        transaccion = new TransactionTemplate(gestor);
    }

    public <R> R ejecutar(PeticionOperacion peticion, Class<R> tipoResultado, Supplier<R> efecto) {
        return ejecutar(peticion, tipoResultado, efecto, () -> {});
    }

    public <R> R ejecutar(
            PeticionOperacion peticion,
            Class<R> tipoResultado,
            Supplier<R> efecto,
            Runnable replay) {
        long limite = System.nanoTime() + ESPERA;
        boolean esperando = false;
        var clave =
                new Clave(
                        es.gestionsolicitudes.demo.dominio.ContextoDemo.ambito(),
                        peticion.usuario(),
                        peticion.clave());
        var titular =
                new EnCurso(
                        peticion.tipo(),
                        peticion.recurso(),
                        new CountDownLatch(1),
                        new AtomicBoolean());
        try {
            var anteriorLocal = enCurso.putIfAbsent(clave, titular);
            while (anteriorLocal != null) {
                if (!esperando) {
                    esperas.incrementAndGet();
                    esperando = true;
                }
                long restante = limite - System.nanoTime();
                if (restante <= 0)
                    throw new ErrorOperacion(ErrorOperacion.Codigo.OPERACION_EN_PROGRESO);
                try {
                    if (!anteriorLocal.fin().await(restante, TimeUnit.NANOSECONDS))
                        throw new ErrorOperacion(ErrorOperacion.Codigo.OPERACION_EN_PROGRESO);
                } catch (InterruptedException error) {
                    Thread.currentThread().interrupt();
                    throw new ErrorOperacion(ErrorOperacion.Codigo.OPERACION_EN_PROGRESO);
                }
                anteriorLocal = enCurso.putIfAbsent(clave, titular);
            }
            do {
                // Un intento fallido devuelve la conexión antes de esperar. Veinte duplicados
                // no retienen el pool de cinco conexiones durante la transacción del titular.
                Terminada<R> terminada =
                        transaccion.execute(
                                tx -> {
                                    if (!repositorio.intentarBloqueo(
                                            peticion.usuario(), peticion.clave())) return null;
                                    titular.cierreTransaccional().set(true);
                                    TransactionSynchronizationManager.registerSynchronization(
                                            new TransactionSynchronization() {
                                                @Override
                                                public void afterCompletion(int estado) {
                                                    liberar(clave, titular);
                                                }
                                            });
                                    autorizacion.exigir(
                                            peticion.usuario(),
                                            peticion.tipo(),
                                            peticion.recurso(),
                                            true);
                                    var anterior =
                                            repositorio.buscar(
                                                    peticion.usuario(), peticion.clave());
                                    if (anterior.isPresent()) {
                                        var guardada = anterior.get();
                                        if (guardada.tipo() != peticion.tipo()
                                                || !guardada.huella()
                                                        .equals(
                                                                guardada.versionHuella() == 1
                                                                        ? peticion.huellaLegada()
                                                                        : peticion.huella()))
                                            throw new ErrorOperacion(
                                                    ErrorOperacion.Codigo
                                                            .CLAVE_IDEMPOTENCIA_REUTILIZADA);
                                        autorizacion.exigir(
                                                peticion.usuario(),
                                                guardada.tipo(),
                                                guardada.recurso(),
                                                true);
                                        replay.run();
                                        return new Terminada<>(
                                                tipoResultado.cast(guardada.resultado()));
                                    }
                                    R resultado = efecto.get();
                                    repositorio.guardar(
                                            peticion,
                                            resultado,
                                            reloj.instant().truncatedTo(ChronoUnit.MICROS));
                                    return new Terminada<>(resultado);
                                });
                if (terminada != null) return terminada.resultado();
                if (!esperando) {
                    esperas.incrementAndGet();
                    esperando = true;
                }
                long restante = limite - System.nanoTime();
                if (restante <= 0 || Thread.currentThread().isInterrupted()) break;
                LockSupport.parkNanos(Math.min(restante, TimeUnit.MILLISECONDS.toNanos(20)));
            } while (System.nanoTime() < limite);
            throw new ErrorOperacion(ErrorOperacion.Codigo.OPERACION_EN_PROGRESO);
        } finally {
            if (esperando) esperas.decrementAndGet();
            if (!titular.cierreTransaccional().get()) liberar(clave, titular);
        }
    }

    private void liberar(Clave clave, EnCurso titular) {
        enCurso.remove(clave, titular);
        titular.fin().countDown();
    }

    /** Contención local observada; no expresa latencia ni rendimiento productivo. */
    public int esperasEnCurso() {
        return esperas.get();
    }

    public EstadoOperacion consultar(UUID usuario, UUID clave) {
        var confirmada = repositorio.buscar(usuario, clave);
        if (confirmada.isPresent()) return visible(usuario, confirmada.get());
        var pendiente =
                enCurso.get(
                        new Clave(
                                es.gestionsolicitudes.demo.dominio.ContextoDemo.ambito(),
                                usuario,
                                clave));
        if (pendiente != null) {
            autorizacion.exigirConsulta(usuario, pendiente.tipo(), pendiente.recurso());
            return new EstadoOperacion("EN_PROGRESO", pendiente.tipo(), pendiente.recurso(), null);
        }
        // El commit puede ocurrir entre la primera lectura y la retirada del titular.
        return repositorio
                .buscar(usuario, clave)
                .map(r -> visible(usuario, r))
                .orElseThrow(
                        () -> new ErrorOperacion(ErrorOperacion.Codigo.OPERACION_NO_ENCONTRADA));
    }

    private EstadoOperacion visible(UUID usuario, RepositorioOperaciones.Confirmada guardada) {
        autorizacion.exigirConsulta(usuario, guardada.tipo(), guardada.recurso());
        return guardada.estado();
    }
}
