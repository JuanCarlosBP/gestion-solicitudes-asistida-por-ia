package es.gestionsolicitudes.operaciones.dominio;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

public final class HuellaOperacion {
    private HuellaOperacion() {}

    /** CI2; seguido de N; o S&lt;bytes UTF-8&gt;:&lt;valor&gt;;, en el orden aprobado. */
    public static String canonica(
            TipoOperacion tipo, UUID usuario, UUID recurso, Long version, List<String> campos) {
        var texto = new StringBuilder("CI2;");
        campo(texto, tipo.name());
        campo(texto, usuario.toString());
        campo(texto, recurso == null ? null : recurso.toString());
        campo(texto, version == null ? null : version.toString());
        campos.forEach(c -> campo(texto, c));
        return hash(texto.toString());
    }

    private static void campo(StringBuilder texto, String valor) {
        if (valor == null) texto.append("N;");
        else
            texto.append('S')
                    .append(valor.getBytes(StandardCharsets.UTF_8).length)
                    .append(':')
                    .append(valor)
                    .append(';');
    }

    public static String hash(String valor) {
        return HexFormat.of().formatHex(digest(valor));
    }

    /** Conserva el espacio advisory heredado de 004/005. */
    public static long bloqueo(UUID usuario, UUID clave) {
        return ByteBuffer.wrap(digest(usuario + ":" + clave)).getLong();
    }

    private static byte[] digest(String valor) {
        try {
            return MessageDigest.getInstance("SHA-256")
                    .digest(valor.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 no disponible", error);
        }
    }

    public static UUID uuid(String texto) {
        if (texto == null) throw new ErrorOperacion(ErrorOperacion.Codigo.SOLICITUD_INVALIDA);
        try {
            UUID valor = UUID.fromString(texto);
            if (!valor.toString().equalsIgnoreCase(texto)) throw new IllegalArgumentException();
            return valor;
        } catch (IllegalArgumentException error) {
            throw new ErrorOperacion(ErrorOperacion.Codigo.SOLICITUD_INVALIDA);
        }
    }
}
