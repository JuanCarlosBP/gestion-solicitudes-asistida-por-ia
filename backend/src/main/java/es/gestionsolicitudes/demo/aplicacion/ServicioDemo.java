package es.gestionsolicitudes.demo.aplicacion;

import es.gestionsolicitudes.demo.configuracion.PropiedadesDemo;
import es.gestionsolicitudes.demo.dominio.ContextoDemo;
import es.gestionsolicitudes.demo.dominio.ErrorDemo;
import es.gestionsolicitudes.demo.persistencia.FuenteDemo;
import es.gestionsolicitudes.demo.persistencia.RepositorioDemo;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import org.springframework.scheduling.annotation.Scheduled;

public final class ServicioDemo {
    private static final SecureRandom AZAR = new SecureRandom();

    public record Reserva(ContextoDemo contexto, String cookie) {
        @Override
        public String toString() {
            return "Reserva[credencial omitida]";
        }
    }

    @FunctionalInterface
    public interface OperacionAdmitida<E1 extends Exception, E2 extends Exception> {
        void ejecutar(ContextoDemo contexto) throws E1, E2;
    }

    private final PropiedadesDemo propiedades;
    private final RepositorioDemo repositorio;
    private final FuenteDemo fuente;
    private final Clock reloj;
    private final Map<String, ReentrantReadWriteLock> gates = new ConcurrentHashMap<>();
    // Inventario cerrado: memoria acotada, sin claves elegidas por clientes ni IP almacenada.
    private final Map<String, Ventana> limites = new ConcurrentHashMap<>();

    private static final class Ventana {
        private long minuto = Long.MIN_VALUE;
        private int cantidad;

        synchronized boolean admitir(long actual, int maximo) {
            if (minuto != actual) {
                minuto = actual;
                cantidad = 0;
            }
            return ++cantidad <= maximo;
        }
    }

    public ServicioDemo(
            PropiedadesDemo propiedades,
            RepositorioDemo repositorio,
            FuenteDemo fuente,
            Clock reloj) {
        this.propiedades = propiedades;
        this.repositorio = repositorio;
        this.fuente = fuente;
        this.reloj = reloj;
        propiedades
                .espacios()
                .keySet()
                .forEach(id -> gates.put(id, new ReentrantReadWriteLock(true)));
    }

    public Reserva reservar(String cookie) {
        var actual = repositorio.vigente(hash(cookie), reloj.instant());
        if (actual != null) return new Reserva(actual, cookie);
        limitar("reservas", propiedades.reservasMinuto());
        byte[] bytes = new byte[32];
        AZAR.nextBytes(bytes);
        var valor = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        return new Reserva(repositorio.reservar(hash(valor), reloj.instant()), valor);
    }

    /** Mantiene el gate durante la operación completa y lo libera incluso ante Error. */
    public <E1 extends Exception, E2 extends Exception> void admitir(
            String cookie, String selector, OperacionAdmitida<E1, E2> operacion) throws E1, E2 {
        if (selector == null || selector.length() > 140) throw ErrorDemo.invalida();
        String espacio = selector.split(":", -1)[0];
        var gate = gates.get(espacio);
        if (gate == null) throw ErrorDemo.invalida();
        var lectura = gate.readLock();
        lectura.lock();
        try {
            operacion.ejecutar(repositorio.validar(hash(cookie), selector, reloj.instant()));
        } finally {
            lectura.unlock();
        }
    }

    public void limitarPeticion(ContextoDemo contexto, boolean autenticacion) {
        limitar("peticion:" + contexto.espacio(), propiedades.peticionesMinuto());
        if (autenticacion)
            limitar("autenticacion:" + contexto.espacio(), propiedades.autenticacionMinuto());
    }

    private void limitar(String clave, int maximo) {
        if (!limites.computeIfAbsent(clave, ignorada -> new Ventana())
                .admitir(reloj.instant().getEpochSecond() / 60, maximo))
            throw new ErrorDemo(429, "DEMO_LIMITE_PETICIONES");
    }

    public void comprobarEscritura(ContextoDemo contexto) {
        try {
            long bytes = fuente.bytes(contexto.espacio(), contexto.generacion());
            repositorio.bytes(contexto, bytes);
            if (bytes >= propiedades.almacenamientoBytes())
                throw new ErrorDemo(507, "DEMO_LIMITE_ALMACENAMIENTO");
        } catch (java.sql.SQLException error) {
            throw new ErrorDemo(503, "DEPENDENCIA_NO_DISPONIBLE");
        }
    }

    public void liberar(ContextoDemo contexto) {
        repositorio.liberar(contexto, reloj.instant());
    }

    public int disponibles() {
        return repositorio.disponibles();
    }

    public PropiedadesDemo propiedades() {
        return propiedades;
    }

    @Scheduled(fixedDelayString = "${demo.drenaje-milisegundos:1000}")
    public void reconciliar() {
        try {
            repositorio.expirar(reloj.instant());
            for (var espacio : repositorio.espacios()) {
                if (!"DRENANDO".equals(espacio.estado())) continue;
                var escritura = gates.get(espacio.id()).writeLock();
                if (!escritura.tryLock()) continue;
                try {
                    fuente.drenar(espacio.id());
                    repositorio.reciclable(espacio, reloj.instant());
                } catch (RuntimeException error) {
                    repositorio.cambiar(
                            espacio.id(),
                            espacio.generacion(),
                            "DRENANDO",
                            "BLOQUEADO",
                            "FALLO_DRENAJE",
                            reloj.instant());
                } finally {
                    escritura.unlock();
                }
            }
        } catch (RuntimeException error) {
            // Denegación cerrada: la próxima admisión consulta control. Nunca registrar
            // SQL/secretos.
            System.getLogger(ServicioDemo.class.getName())
                    .log(System.Logger.Level.WARNING, "DEMO_RECONCILIACION_NO_DISPONIBLE");
        }
    }

    public static String hash(String cookie) {
        if (cookie == null || !cookie.matches("[A-Za-z0-9_-]{43}")) return null;
        try {
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-256")
                                    .digest(cookie.getBytes(StandardCharsets.US_ASCII)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 no disponible");
        }
    }
}
