package es.gestionsolicitudes.solicitudes.dominio;

public final class ErrorSolicitud extends RuntimeException {
    public enum Codigo {
        SOLICITUD_INVALIDA,
        ACCESO_NO_PERMITIDO,
        SOLICITUD_NO_ENCONTRADA,
        VERSION_OBSOLETA,
        SOLICITUD_NO_EDITABLE,
        SOLICITUD_NO_DECIDIBLE,
        PROVEEDOR_INACTIVO,
        SUPERVISOR_INVALIDO,
        CLAVE_IDEMPOTENCIA_REUTILIZADA,
        NUMERACION_AGOTADA
    }

    private final Codigo codigo;

    public ErrorSolicitud(Codigo codigo) {
        super(codigo.name());
        this.codigo = codigo;
    }

    public Codigo codigo() {
        return codigo;
    }

    public static ErrorSolicitud invalida() {
        return new ErrorSolicitud(Codigo.SOLICITUD_INVALIDA);
    }
}
