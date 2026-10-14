package es.gestionsolicitudes.proveedores.dominio;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/** Datos editables validados; la clave fiscal normalizada nunca forma parte del DTO público. */
public record DatosProveedor(
        TipoProveedor tipo,
        String denominacion,
        String paisFiscal,
        String identificadorFiscal,
        String correoContacto,
        String telefonoContacto) {
    private static final Set<String> PAISES = Set.of(Locale.getISOCountries());
    private static final Pattern ESPACIOS =
            Pattern.compile("[\\p{javaWhitespace}\\p{Z}\\x{0085}]+");
    private static final Pattern CORREO =
            Pattern.compile(
                    "[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\\.)+[A-Za-z]{2,}");

    public DatosProveedor {
        if (tipo == null) throw ErrorProveedor.invalido();
        denominacion = recortar(denominacion);
        longitud(denominacion, 1, 160);
        validarPais(paisFiscal);
        longitud(identificadorFiscal, 3, 64);
        normalizarFiscal(identificadorFiscal);
        if (correoContacto != null) {
            longitud(correoContacto, 1, 254);
            if (!CORREO.matcher(correoContacto).matches()) throw ErrorProveedor.invalido();
        }
        if (telefonoContacto != null) longitud(telefonoContacto, 0, 32);
    }

    public String fiscalNormalizado() {
        return normalizarFiscal(identificadorFiscal);
    }

    public static String normalizarFiscal(String entrada) {
        longitud(entrada, 3, 64);
        String normalizado =
                ESPACIOS.matcher(
                                recortar(Normalizer.normalize(entrada, Normalizer.Form.NFKC))
                                        .toUpperCase(Locale.ROOT))
                        .replaceAll(" ");
        longitud(normalizado, 3, 64);
        return normalizado;
    }

    public static void validarPais(String pais) {
        if (pais == null || !PAISES.contains(pais)) throw ErrorProveedor.invalido();
    }

    public static void longitud(String valor, int minimo, int maximo) {
        if (valor == null
                || valor.codePointCount(0, valor.length()) < minimo
                || valor.codePointCount(0, valor.length()) > maximo)
            throw ErrorProveedor.invalido();
        // PostgreSQL no admite NUL ni secuencias UTF-16 incompletas.
        for (int i = 0; i < valor.length(); i++) {
            char caracter = valor.charAt(i);
            if (caracter == 0 || Character.isLowSurrogate(caracter))
                throw ErrorProveedor.invalido();
            if (Character.isHighSurrogate(caracter)
                    && (++i >= valor.length() || !Character.isLowSurrogate(valor.charAt(i))))
                throw ErrorProveedor.invalido();
        }
    }

    private static String recortar(String valor) {
        if (valor == null) throw ErrorProveedor.invalido();
        int inicio = 0;
        int fin = valor.length();
        while (inicio < fin && espacio(valor.codePointAt(inicio)))
            inicio += Character.charCount(valor.codePointAt(inicio));
        while (fin > inicio && espacio(valor.codePointBefore(fin)))
            fin -= Character.charCount(valor.codePointBefore(fin));
        return valor.substring(inicio, fin);
    }

    private static boolean espacio(int caracter) {
        return Character.isWhitespace(caracter)
                || Character.isSpaceChar(caracter)
                || caracter == 0x85;
    }
}
