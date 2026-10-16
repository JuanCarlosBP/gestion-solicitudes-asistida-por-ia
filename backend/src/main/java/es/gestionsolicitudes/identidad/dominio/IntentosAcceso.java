package es.gestionsolicitudes.identidad.dominio;

import java.time.Duration;
import java.time.Instant;

public record IntentosAcceso(int fallos, Instant inicioVentana, Instant bloqueadoHasta) {
    private static final Duration VENTANA = Duration.ofMinutes(15);

    public static IntentosAcceso vacios() {
        return new IntentosAcceso(0, null, null);
    }

    public boolean bloqueado(Instant ahora) {
        return bloqueadoHasta != null && ahora.isBefore(bloqueadoHasta);
    }

    public IntentosAcceso fallo(Instant ahora) {
        if (bloqueado(ahora)) {
            return this;
        }
        boolean nuevaVentana =
                inicioVentana == null || !ahora.isBefore(inicioVentana.plus(VENTANA));
        int nuevosFallos = nuevaVentana ? 1 : fallos + 1;
        return new IntentosAcceso(
                nuevosFallos,
                nuevaVentana ? ahora : inicioVentana,
                nuevosFallos >= 5 ? ahora.plus(VENTANA) : null);
    }
}
