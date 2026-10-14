package es.gestionsolicitudes.proveedores.dominio;

public record ConsultaProveedores(
        String denominacion,
        String fiscalNormalizado,
        TipoProveedor tipo,
        String paisFiscal,
        Boolean activo,
        int pagina,
        int tamano,
        Orden orden,
        boolean descendente) {
    public enum Orden {
        DENOMINACION,
        CREADO_EN,
        ACTUALIZADO_EN
    }

    public ConsultaProveedores {
        if (denominacion != null) DatosProveedor.longitud(denominacion, 0, 128);
        if (fiscalNormalizado != null)
            fiscalNormalizado = DatosProveedor.normalizarFiscal(fiscalNormalizado);
        if (paisFiscal != null) DatosProveedor.validarPais(paisFiscal);
        if (pagina < 0 || tamano < 1 || tamano > 100 || orden == null)
            throw ErrorProveedor.invalido();
    }
}
