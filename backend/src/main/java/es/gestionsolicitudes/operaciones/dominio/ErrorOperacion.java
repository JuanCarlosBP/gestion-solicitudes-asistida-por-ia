package es.gestionsolicitudes.operaciones.dominio;

public final class ErrorOperacion extends RuntimeException {
    public enum Codigo {
        SOLICITUD_INVALIDA,
        ACCESO_NO_PERMITIDO,
        OPERACION_NO_ENCONTRADA,
        CLAVE_IDEMPOTENCIA_REUTILIZADA,
        OPERACION_EN_PROGRESO
    }

    private final Codigo codigo;

    public ErrorOperacion(Codigo codigo) {
        super(codigo.name());
        this.codigo = codigo;
    }

    public Codigo codigo() {
        return codigo;
    }
}
