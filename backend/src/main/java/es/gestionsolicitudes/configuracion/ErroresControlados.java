package es.gestionsolicitudes.configuracion;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ErroresControlados {
    public record ErrorPublico(String error) {}

    @ExceptionHandler(es.gestionsolicitudes.operaciones.dominio.ErrorOperacion.class)
    public org.springframework.http.ResponseEntity<ErrorPublico> tratarOperacion(
            es.gestionsolicitudes.operaciones.dominio.ErrorOperacion error) {
        int estado =
                switch (error.codigo()) {
                    case SOLICITUD_INVALIDA -> 400;
                    case ACCESO_NO_PERMITIDO -> 403;
                    case OPERACION_NO_ENCONTRADA -> 404;
                    default -> 409;
                };
        var respuesta = org.springframework.http.ResponseEntity.status(estado);
        if (error.codigo()
                == es.gestionsolicitudes.operaciones.dominio.ErrorOperacion.Codigo
                        .OPERACION_EN_PROGRESO) respuesta.header("Retry-After", "1");
        return respuesta.body(new ErrorPublico(error.codigo().name()));
    }

    @ExceptionHandler(es.gestionsolicitudes.solicitudes.dominio.ErrorSolicitud.class)
    public org.springframework.http.ResponseEntity<ErrorPublico> tratarSolicitud(
            es.gestionsolicitudes.solicitudes.dominio.ErrorSolicitud error) {
        int estado =
                switch (error.codigo()) {
                    case SOLICITUD_INVALIDA -> 400;
                    case ACCESO_NO_PERMITIDO -> 403;
                    case SOLICITUD_NO_ENCONTRADA -> 404;
                    case NUMERACION_AGOTADA -> 503;
                    default -> 409;
                };
        return org.springframework.http.ResponseEntity.status(estado)
                .body(new ErrorPublico(error.codigo().name()));
    }

    @ExceptionHandler(es.gestionsolicitudes.proveedores.dominio.ErrorProveedor.class)
    public org.springframework.http.ResponseEntity<ErrorPublico> tratarProveedor(
            es.gestionsolicitudes.proveedores.dominio.ErrorProveedor error) {
        int estado =
                switch (error.codigo()) {
                    case SOLICITUD_INVALIDA -> 400;
                    case ACCESO_NO_PERMITIDO -> 403;
                    case PROVEEDOR_NO_ENCONTRADO -> 404;
                    case PROVEEDOR_DUPLICADO, VERSION_OBSOLETA -> 409;
                };
        return org.springframework.http.ResponseEntity.status(estado)
                .body(new ErrorPublico(error.codigo().name()));
    }

    @ExceptionHandler({
        org.springframework.dao.DataAccessResourceFailureException.class,
        org.springframework.transaction.CannotCreateTransactionException.class
    })
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public ErrorPublico tratarDependencia() {
        return new ErrorPublico("DEPENDENCIA_NO_DISPONIBLE");
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ErrorPublico tratarPermisoDenegado() {
        return new ErrorPublico("ACCESO_NO_PERMITIDO");
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorPublico tratarEntradaInvalida() {
        return new ErrorPublico("SOLICITUD_INVALIDA");
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorPublico tratarFalloInesperado(Exception error) {
        return new ErrorPublico("ERROR_INTERNO");
    }
}
