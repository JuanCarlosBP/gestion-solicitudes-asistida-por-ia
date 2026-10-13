package es.gestionsolicitudes.identidad.configuracion;

import java.time.Duration;

public record DuracionesIdentidad(Duration acceso, Duration refresco) {
    public DuracionesIdentidad {
        if (acceso.isNegative()
                || acceso.isZero()
                || refresco.isNegative()
                || refresco.isZero()
                || acceso.compareTo(refresco) > 0
                || acceso.getNano() != 0
                || refresco.getNano() != 0) {
            throw new IllegalArgumentException("Duraciones de identidad no válidas");
        }
    }
}
