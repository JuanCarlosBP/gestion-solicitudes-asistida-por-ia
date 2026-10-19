package es.gestionsolicitudes.demo.configuracion;

import com.zaxxer.hikari.HikariDataSource;
import es.gestionsolicitudes.demo.aplicacion.CredencialesDemo;
import es.gestionsolicitudes.demo.aplicacion.ServicioDemo;
import es.gestionsolicitudes.demo.http.FiltroContextoDemo;
import es.gestionsolicitudes.demo.persistencia.FuenteDemo;
import es.gestionsolicitudes.demo.persistencia.RepositorioDemo;
import java.nio.file.Path;
import java.time.Clock;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@Profile("demo")
@EnableScheduling
public class ConfiguracionDemo {
    @Bean
    PropiedadesDemo propiedadesDemo(Environment entorno) {
        if (entorno.acceptsProfiles(Profiles.of("local", "test")))
            throw new IllegalStateException(
                    "Demo no admite perfiles con cuentas o claves efímeras");
        var propiedades = PropiedadesDemo.cargar(entorno.getRequiredProperty("DEMO_CONFIG_RUTA"));
        propiedades.exigirConfiguracionRuntime();
        if (entorno.acceptsProfiles(Profiles.of("demo-local"))
                && !"local".equals(propiedades.requerido("entorno")))
            throw new IllegalStateException("Perfil demo-local incompatible");
        return propiedades;
    }

    @Bean(destroyMethod = "close")
    HikariDataSource controlDemo(PropiedadesDemo propiedades) {
        return PropiedadesDemo.pool(propiedades.destino("control"), 2);
    }

    @Bean
    @Primary
    FuenteDemo dataSource(PropiedadesDemo propiedades) {
        return new FuenteDemo(propiedades);
    }

    @Bean
    RepositorioDemo repositorioDemo(
            @Qualifier("controlDemo") HikariDataSource control, PropiedadesDemo propiedades) {
        return new RepositorioDemo(control, propiedades);
    }

    @Bean
    es.gestionsolicitudes.salud.aplicacion.ComprobacionBaseDatos saludDemo(
            @Qualifier("controlDemo") HikariDataSource control) {
        return new es.gestionsolicitudes.salud.persistencia.ComprobacionPostgres(control);
    }

    @Bean
    CredencialesDemo credencialesDemo(PropiedadesDemo propiedades) {
        return new CredencialesDemo(Path.of(propiedades.requerido("semilla.ruta")));
    }

    @Bean
    ServicioDemo servicioDemo(
            PropiedadesDemo propiedades,
            RepositorioDemo repositorio,
            FuenteDemo fuente,
            Clock reloj) {
        return new ServicioDemo(propiedades, repositorio, fuente, reloj);
    }

    @Bean
    FiltroContextoDemo filtroContextoDemo(ServicioDemo servicio) {
        return new FiltroContextoDemo(servicio);
    }

    @Bean
    FilterRegistrationBean<FiltroContextoDemo> registroFiltroDemo(FiltroContextoDemo filtro) {
        var registro = new FilterRegistrationBean<>(filtro);
        registro.setEnabled(false);
        return registro;
    }
}
