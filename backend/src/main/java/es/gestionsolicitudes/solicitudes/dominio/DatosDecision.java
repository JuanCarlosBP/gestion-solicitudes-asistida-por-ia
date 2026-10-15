package es.gestionsolicitudes.solicitudes.dominio;

public record DatosDecision(Tipo tipo, String comentario, String motivo) {
    public enum Tipo {
        APROBAR,
        RECHAZAR
    }

    public DatosDecision {
        if (tipo == null) throw ErrorSolicitud.invalida();
        if (tipo == Tipo.APROBAR) {
            if (motivo != null) throw ErrorSolicitud.invalida();
            if (comentario != null) {
                comentario = DatosBorrador.texto(comentario, 0, 500);
                if (comentario.isEmpty()) comentario = null;
            }
        } else {
            if (comentario != null) throw ErrorSolicitud.invalida();
            motivo = DatosBorrador.texto(motivo, 10, 1000);
        }
    }

    public String estadoResultante() {
        return tipo == Tipo.APROBAR ? "APROBADA" : "RECHAZADA";
    }

    /** Texto normalizado con marca de nulidad y longitud: ninguna concatenación es ambigua. */
    public String textoParaHuella() {
        String texto = tipo == Tipo.APROBAR ? comentario : motivo;
        return texto == null ? "N" : "S" + texto.length() + ":" + texto;
    }
}
