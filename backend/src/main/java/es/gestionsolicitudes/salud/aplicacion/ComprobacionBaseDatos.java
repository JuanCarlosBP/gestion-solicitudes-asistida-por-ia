package es.gestionsolicitudes.salud.aplicacion;

/** Puerto técnico que no expone detalles de conexión a la capa HTTP. */
public interface ComprobacionBaseDatos {
    boolean disponible();
}
