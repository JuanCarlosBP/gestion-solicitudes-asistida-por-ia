package es.gestionsolicitudes.proveedores.dominio;

public final class ErrorProveedor extends RuntimeException {
    public enum Codigo {
        SOLICITUD_INVALIDA,
        ACCESO_NO_PERMITIDO,
        PROVEEDOR_NO_ENCONTRADO,
        PROVEEDOR_DUPLICADO,
        VERSION_OBSOLETA
    }

    private final Codigo codigo;

    public ErrorProveedor(Codigo codigo) {
        super(codigo.name());
        this.codigo = codigo;
    }

    public Codigo codigo() {
        return codigo;
    }

    public static ErrorProveedor invalido() {
        return new ErrorProveedor(Codigo.SOLICITUD_INVALIDA);
    }
}
