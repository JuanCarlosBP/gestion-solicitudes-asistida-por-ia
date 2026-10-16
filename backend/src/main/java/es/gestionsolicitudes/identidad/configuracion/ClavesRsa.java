package es.gestionsolicitudes.identidad.configuracion;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPairGenerator;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

public record ClavesRsa(RSAPrivateKey privada, RSAPublicKey publica) {
    private static final SecureRandom AZAR = new SecureRandom();

    public static ClavesRsa cargar(Environment entorno) {
        try {
            if (entorno.acceptsProfiles(Profiles.of("local", "test"))) {
                KeyPairGenerator generador = KeyPairGenerator.getInstance("RSA");
                generador.initialize(2048);
                var par = generador.generateKeyPair();
                return new ClavesRsa(
                        (RSAPrivateKey) par.getPrivate(), (RSAPublicKey) par.getPublic());
            }
            KeyFactory fabrica = KeyFactory.getInstance("RSA");
            var privada =
                    (RSAPrivateKey)
                            fabrica.generatePrivate(
                                    new PKCS8EncodedKeySpec(
                                            leer(
                                                    entorno,
                                                    "IDENTIDAD_CLAVE_PRIVADA",
                                                    "PRIVATE KEY")));
            var publica =
                    (RSAPublicKey)
                            fabrica.generatePublic(
                                    new X509EncodedKeySpec(
                                            leer(
                                                    entorno,
                                                    "IDENTIDAD_CLAVE_PUBLICA",
                                                    "PUBLIC KEY")));
            if (publica.getModulus().bitLength() < 2048
                    || !privada.getModulus().equals(publica.getModulus())) {
                throw new IllegalArgumentException("Par RSA incompatible");
            }
            byte[] desafio = new byte[32];
            AZAR.nextBytes(desafio);
            Signature firma = Signature.getInstance("SHA256withRSA");
            firma.initSign(privada);
            firma.update(desafio);
            byte[] firmado = firma.sign();
            firma.initVerify(publica);
            firma.update(desafio);
            if (!firma.verify(firmado)) {
                throw new IllegalArgumentException("El par RSA no verifica su propia firma");
            }
            return new ClavesRsa(privada, publica);
        } catch (GeneralSecurityException | IOException | IllegalArgumentException error) {
            // No propagar mensajes de proveedores ni contenido de claves al diagnóstico de
            // arranque.
            throw new IllegalStateException(
                    "Claves RSA externas ausentes o inválidas: configure IDENTIDAD_CLAVE_PRIVADA y PUBLICA mediante _RUTA o _PEM (PKCS8/X509, mínimo 2048 bits)");
        }
    }

    private static byte[] leer(Environment entorno, String prefijo, String tipo)
            throws IOException {
        String ruta = entorno.getProperty(prefijo + "_RUTA");
        String valor = entorno.getProperty(prefijo + "_PEM");
        if ((ruta == null) == (valor == null)) {
            throw new IllegalArgumentException("Debe configurar una fuente por clave");
        }
        String pem = ruta == null ? valor : Files.readString(Path.of(ruta));
        String inicio = "-----BEGIN " + tipo + "-----";
        String fin = "-----END " + tipo + "-----";
        String limpio = pem.strip();
        if (!limpio.startsWith(inicio) || !limpio.endsWith(fin)) {
            throw new IllegalArgumentException("Formato de clave incorrecto");
        }
        return Base64.getDecoder()
                .decode(
                        limpio.substring(inicio.length(), limpio.length() - fin.length())
                                .replaceAll("\\s", ""));
    }

    @Override
    public String toString() {
        return "ClavesRsa[omitidas]";
    }
}
