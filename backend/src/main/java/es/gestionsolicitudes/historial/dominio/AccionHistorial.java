package es.gestionsolicitudes.historial.dominio;

public enum AccionHistorial {
    PROVEEDOR_CREADO("Proveedor creado"),
    PROVEEDOR_MODIFICADO("Proveedor modificado"),
    PROVEEDOR_DESACTIVADO("Proveedor desactivado"),
    PROVEEDOR_REACTIVADO("Proveedor reactivado"),
    BORRADOR_CREADO("Borrador creado"),
    BORRADOR_GUARDADO("Borrador guardado"),
    SOLICITUD_PRESENTADA("Solicitud presentada"),
    APROBADA("Solicitud aprobada"),
    RECHAZADA("Solicitud rechazada");

    private final String resumen;

    AccionHistorial(String resumen) {
        this.resumen = resumen;
    }

    public String resumen() {
        return resumen;
    }
}
