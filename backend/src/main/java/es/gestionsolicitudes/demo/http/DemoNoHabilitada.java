package es.gestionsolicitudes.demo.http;

import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Señal de indisponibilidad para la UI, fuera del contrato OpenAPI de negocio. */
@Hidden
@RestController
@Profile("!demo")
public class DemoNoHabilitada {
    @GetMapping("/api/demo")
    public ResponseEntity<Void> presentacion() {
        return ResponseEntity.notFound().build();
    }
}
