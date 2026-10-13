package es.gestionsolicitudes.identidad.dominio;

/** Datos internos: no se serializan ni se incluyen en mensajes o registros. */
public record Usuario(
        UsuarioPublico publico, String claveHash, boolean habilitado, IntentosAcceso intentos) {
    @Override
    public String toString() {
        return "Usuario[datos internos omitidos]";
    }
}
