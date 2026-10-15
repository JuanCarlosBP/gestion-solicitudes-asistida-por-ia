package es.gestionsolicitudes.configuracion;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ContratoApi {
    @Bean
    OpenAPI apiTecnica() {
        return new OpenAPI()
                .info(
                        new Info()
                                .title("Gestión de Solicitudes — API")
                                .version("0.0.7")
                                .description(
                                        "Identidad, proveedores, solicitudes e importes EUR; decisiones por supervisor asignado. Bearer y X-XSRF-TOKEN en mutaciones. Idempotency-Key UUID obligatorio en siete POST de negocio; PUT conserva versión optimista. Replay original autorizado, espera máxima de tres segundos y recuperación GET de operación propia con permisos vigentes. Historial atómico desde V7, proyección de decisiones V5 sin duplicación y resumen según permisos actuales. Sin reconstrucción de historia anterior ni purga automática. Documentación pública solo en local/test."))
                .components(
                        new Components()
                                .addSecuritySchemes(
                                        "BearerAuth",
                                        new SecurityScheme()
                                                .type(SecurityScheme.Type.HTTP)
                                                .scheme("bearer")
                                                .bearerFormat("JWT")
                                                .description(
                                                        "JWT RS256 de acceso. No introducir el refresh.")))
                .servers(List.of(new Server().url("/").description("Mismo origen local")));
    }
}
