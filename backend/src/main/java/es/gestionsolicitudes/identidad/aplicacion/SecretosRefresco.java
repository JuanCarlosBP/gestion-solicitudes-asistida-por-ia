package es.gestionsolicitudes.identidad.aplicacion;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class SecretosRefresco {
    private final SecureRandom azar = new SecureRandom();

    public Credencial nueva() {
        byte[] secreto = new byte[32];
        azar.nextBytes(secreto);
        return new Credencial(
                UUID.randomUUID(), Base64.getUrlEncoder().withoutPadding().encodeToString(secreto));
    }

    public Optional<Credencial> interpretar(String valor) {
        if (valor == null
                || !valor.matches(
                        "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.[A-Za-z0-9_-]{43}")) {
            return Optional.empty();
        }
        return Optional.of(
                new Credencial(UUID.fromString(valor.substring(0, 36)), valor.substring(37)));
    }

    public record Credencial(UUID id, String secreto) {
        public String valorCookie() {
            return id + "." + secreto;
        }

        public byte[] hash() {
            try {
                return MessageDigest.getInstance("SHA-256")
                        .digest(secreto.getBytes(StandardCharsets.US_ASCII));
            } catch (NoSuchAlgorithmException error) {
                throw new IllegalStateException("SHA-256 no disponible", error);
            }
        }

        public boolean coincide(byte[] hashGuardado) {
            return MessageDigest.isEqual(hash(), hashGuardado);
        }

        @Override
        public String toString() {
            return "Credencial[omitida]";
        }
    }
}
