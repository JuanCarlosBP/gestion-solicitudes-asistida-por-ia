package es.gestionsolicitudes.configuracion;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
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
                                .title("Gestión de Solicitudes — API técnica")
                                .version("0.0.1")
                                .description(
                                        "Base verificable local. No contiene operaciones de negocio."))
                .servers(List.of(new Server().url("/").description("Mismo origen local")));
    }
}
