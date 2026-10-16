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
                                .version("0.0.2")
                                .description(
                                        "Identidad y acceso. Access token Bearer en memoria; refresh solo en cookie HttpOnly. Operaciones mutables requieren X-XSRF-TOKEN. Documentación pública solo en local/test."))
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
