package es.gestionsolicitudes.configuracion;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ErroresControlados {
    public record ErrorPublico(String error) {}

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorPublico tratarFalloInesperado(Exception error) {
        return new ErrorPublico("ERROR_INTERNO");
    }
}
