package es.gestionsolicitudes.historial.dominio;

public record ResumenAplicacion(Estados solicitudes, Pendientes accionesPendientes) {
    public record Estados(
            long BORRADOR, long PRESENTADA, long APROBADA, long RECHAZADA, long total) {}

    public record Pendientes(long borradoresPropios, long presentadasAsignadas) {}
}
