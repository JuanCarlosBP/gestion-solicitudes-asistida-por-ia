package es.gestionsolicitudes.identidad.dominio;

import java.util.Locale;

public final class Correo {
    private Correo() {}

    public static String normalizar(String valor) {
        if (valor == null || valor.length() > 512) {
            throw new IllegalArgumentException("Correo no válido");
        }
        String correo = valor.strip().toLowerCase(Locale.ROOT);
        if (correo.isEmpty()
                || correo.length() > 254
                || !correo.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) {
            throw new IllegalArgumentException("Correo no válido");
        }
        return correo;
    }
}
