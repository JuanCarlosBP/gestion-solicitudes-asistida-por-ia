package es.gestionsolicitudes.salud.aplicacion;

import org.springframework.stereotype.Service;

@Service
public class ServicioSalud {
    private final ComprobacionBaseDatos baseDatos;

    public ServicioSalud(ComprobacionBaseDatos baseDatos) {
        this.baseDatos = baseDatos;
    }

    public EstadoSalud comprobar() {
        return baseDatos.disponible() ? EstadoSalud.DISPONIBLE : EstadoSalud.NO_DISPONIBLE;
    }
}
