package es.gestionsolicitudes.operaciones.dominio;

import java.util.*;

public record PeticionOperacion(
        TipoOperacion tipo,
        UUID usuario,
        UUID clave,
        UUID recurso,
        Long version,
        List<String> campos) {
    public PeticionOperacion {
        if (tipo == null
                || usuario == null
                || clave == null
                || campos == null
                || (tipo.alta()
                        ? recurso != null || version != null
                        : recurso == null || version == null || version < 0))
            throw new ErrorOperacion(ErrorOperacion.Codigo.SOLICITUD_INVALIDA);
        campos = Collections.unmodifiableList(new ArrayList<>(campos));
    }

    public static PeticionOperacion de(
            TipoOperacion tipo,
            UUID usuario,
            UUID clave,
            UUID recurso,
            Long version,
            String... campos) {
        return new PeticionOperacion(tipo, usuario, clave, recurso, version, Arrays.asList(campos));
    }

    public String huella() {
        return HuellaOperacion.canonica(tipo, usuario, recurso, version, campos);
    }

    public String huellaLegada() {
        if (tipo == TipoOperacion.PRESENTAR)
            return HuellaOperacion.hash("PRESENTAR:" + recurso + ":" + version);
        if (tipo == TipoOperacion.APROBAR || tipo == TipoOperacion.RECHAZAR) {
            String texto = campos.getFirst();
            return HuellaOperacion.hash(
                    tipo.name()
                            + ":"
                            + recurso
                            + ":"
                            + version
                            + ":"
                            + (texto == null ? "N" : "S" + texto.length() + ":" + texto));
        }
        return null;
    }
}
