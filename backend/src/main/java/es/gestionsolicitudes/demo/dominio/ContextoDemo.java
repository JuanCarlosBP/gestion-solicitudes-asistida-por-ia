package es.gestionsolicitudes.demo.dominio;

import java.time.Instant;
import java.util.UUID;

/** Ámbito admitido por el servidor; nunca se hereda a tareas asíncronas. */
public record ContextoDemo(UUID reservaId, String espacio, UUID generacion, Instant expiraEn) {
    private static final ThreadLocal<ContextoDemo> ACTUAL = new ThreadLocal<>();

    public static ContextoDemo actual() {
        return ACTUAL.get();
    }

    public static ContextoDemo exigir() {
        var actual = actual();
        if (actual == null) throw new IllegalStateException("Contexto demo obligatorio");
        return actual;
    }

    public static void instalar(ContextoDemo contexto) {
        if (ACTUAL.get() != null) throw new IllegalStateException("Contexto demo ya instalado");
        ACTUAL.set(contexto);
    }

    public static void limpiar() {
        ACTUAL.remove();
    }

    public String selector() {
        return espacio + ":" + generacion + ":" + reservaId;
    }

    public static String ambito() {
        var contexto = actual();
        return contexto == null ? "principal" : contexto.selector();
    }

    public static Instant limitar(Instant propuesta) {
        var contexto = actual();
        return contexto != null && contexto.expiraEn().isBefore(propuesta)
                ? contexto.expiraEn()
                : propuesta;
    }
}
