package es.gestionsolicitudes.demo.aplicacion;

import es.gestionsolicitudes.identidad.dominio.Rol;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.Locale;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/** HMAC estándar: cada generación/rol tiene una contraseña propia, almacenada solo como Argon2. */
public final class CredencialesDemo {
    private final byte[] semilla;

    public CredencialesDemo(Path ruta) {
        try {
            semilla = Base64.getDecoder().decode(Files.readString(ruta).strip());
            if (semilla.length < 32 || semilla.length > 4096) throw new IllegalArgumentException();
        } catch (java.io.IOException | IllegalArgumentException error) {
            throw new IllegalStateException("Semilla demo ausente o inválida");
        }
    }

    public String clave(String espacio, UUID generacion, Rol rol) {
        exigirRol(rol);
        try {
            var hmac = Mac.getInstance("HmacSHA256");
            hmac.init(new SecretKeySpec(semilla, "HmacSHA256"));
            return Base64.getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(
                            hmac.doFinal(
                                    ("demo-v1\n" + espacio + "\n" + generacion + "\n" + rol.name())
                                            .getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException error) {
            throw new IllegalStateException("HMAC no disponible");
        }
    }

    public static String correo(UUID generacion, Rol rol) {
        exigirRol(rol);
        return rol.name().toLowerCase(Locale.ROOT) + "." + generacion + "@demo.invalid";
    }

    private static void exigirRol(Rol rol) {
        if (rol == null || rol == Rol.ADMINISTRADOR)
            throw new IllegalArgumentException("Rol demo no permitido");
    }
}
