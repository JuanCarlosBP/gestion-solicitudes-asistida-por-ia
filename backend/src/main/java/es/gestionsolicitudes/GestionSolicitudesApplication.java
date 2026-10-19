package es.gestionsolicitudes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class GestionSolicitudesApplication {
    public static void main(String[] args) {
        var argumentos = java.util.Arrays.asList(args);
        boolean provisionar = argumentos.contains("--demo-provisionar");
        boolean supervisar = argumentos.contains("--demo-supervisar");
        if (provisionar || supervisar) {
            try {
                if (provisionar && supervisar)
                    throw new IllegalArgumentException("Modos demo incompatibles");
                var provisionador =
                        new es.gestionsolicitudes.demo.provision.ProvisionadorDemo(
                                es.gestionsolicitudes.demo.configuracion.PropiedadesDemo.cargar(
                                        System.getenv("DEMO_CONFIG_RUTA")));
                if (supervisar) provisionador.supervisar();
                else provisionador.ejecutar();
                return;
            } catch (RuntimeException error) {
                System.err.println(
                        "DEMO_PROVISION_FALLIDA: revisar configuración, privilegios y estados operativos; diagnóstico sensible omitido");
                System.exit(1);
            }
        }
        SpringApplication.run(GestionSolicitudesApplication.class, args);
    }
}
