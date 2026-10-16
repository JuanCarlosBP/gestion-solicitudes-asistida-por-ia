package es.gestionsolicitudes.identidad.aplicacion;

import java.util.Set;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class Contrasenas {
    // Lista local explícita; no sustituye una futura fuente de contraseñas comprometidas.
    private static final Set<String> COMUNES =
            Set.of(
                    "123456789012345",
                    "1234567890123456",
                    "passwordpassword",
                    "password123456789",
                    "qwertyuiopasdfgh",
                    "contrasenacontrasena",
                    "contraseñacontraseña",
                    "administrador123");
    private final Argon2PasswordEncoder codificador =
            new Argon2PasswordEncoder(16, 32, 1, 19456, 2);
    private final String hashFicticio =
            codificador.encode("comprobación ficticia de cuenta ausente");

    public void validar(String clave) {
        if (!longitudValida(clave) || COMUNES.contains(clave)) {
            throw new IllegalArgumentException("Contraseña fuera de la política permitida");
        }
    }

    public String codificar(String clave) {
        validar(clave);
        return codificador.encode(clave);
    }

    public boolean verificar(String clave, String hash) {
        // Se limita el coste de entradas arbitrariamente grandes sin modificar la contraseña.
        boolean longitud = longitudValida(clave);
        boolean coincide =
                codificador.matches(longitud ? clave : "entrada inválida ficticia", hash);
        return longitud && coincide;
    }

    public void verificarFicticia(String clave) {
        verificar(clave, hashFicticio);
    }

    private boolean longitudValida(String clave) {
        if (clave == null || clave.length() > 256) {
            return false;
        }
        int longitud = clave.codePointCount(0, clave.length());
        return longitud >= 15 && longitud <= 128;
    }
}
