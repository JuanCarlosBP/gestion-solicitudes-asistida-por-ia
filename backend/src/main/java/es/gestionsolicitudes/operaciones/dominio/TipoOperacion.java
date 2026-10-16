package es.gestionsolicitudes.operaciones.dominio;

import es.gestionsolicitudes.identidad.dominio.Rol;

public enum TipoOperacion {
    CREAR_PROVEEDOR(Rol.ADMINISTRADOR, true, true),
    DESACTIVAR_PROVEEDOR(Rol.ADMINISTRADOR, true, false),
    REACTIVAR_PROVEEDOR(Rol.ADMINISTRADOR, true, false),
    CREAR_BORRADOR(Rol.SOLICITANTE, false, true),
    PRESENTAR(Rol.SOLICITANTE, false, false),
    APROBAR(Rol.SUPERVISOR, false, false),
    RECHAZAR(Rol.SUPERVISOR, false, false);

    private final Rol rol;
    private final boolean proveedor;
    private final boolean alta;

    TipoOperacion(Rol rol, boolean proveedor, boolean alta) {
        this.rol = rol;
        this.proveedor = proveedor;
        this.alta = alta;
    }

    public Rol rol() {
        return rol;
    }

    public boolean proveedor() {
        return proveedor;
    }

    public boolean alta() {
        return alta;
    }

    public int estadoHttp() {
        return alta ? 201 : 200;
    }
}
