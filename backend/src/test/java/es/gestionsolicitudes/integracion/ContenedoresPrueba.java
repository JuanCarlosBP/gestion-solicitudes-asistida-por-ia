package es.gestionsolicitudes.integracion;

import java.util.UUID;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.TestcontainersConfiguration;

/** Soporte opcional de QA para detener PostgreSQL conservando el contenedor y su volumen. */
public final class ContenedoresPrueba {
    private ContenedoresPrueba() {}

    public static PostgreSQLContainer postgres(DockerImageName imagen) {
        if (!Boolean.parseBoolean(System.getenv("GESTION_QA_CONSERVAR_CONTENEDORES"))) {
            return new PostgreSQLContainer(imagen);
        }
        validarConservacion();
        return new PostgresConservado(imagen);
    }

    private static void validarConservacion() {
        // En 2.0.5, reuse mantiene Ryuk sin iniciar y evita el registro para limpieza.
        // RYUK_DISABLED=true seleccionaría otro reaper con un hook JVM que ejecuta prune.
        if (!"2.0.5".equals(DockerClientFactory.class.getPackage().getImplementationVersion())
                || !"true".equalsIgnoreCase(System.getenv("TESTCONTAINERS_REUSE_ENABLE"))
                || !TestcontainersConfiguration.getInstance().environmentSupportsReuse()
                || !"false".equalsIgnoreCase(System.getenv("TESTCONTAINERS_RYUK_DISABLED"))) {
            throw new IllegalStateException(
                    "Conservación QA requiere Testcontainers 2.0.5, REUSE_ENABLE=true y"
                            + " RYUK_DISABLED=false; no se ha iniciado PostgreSQL");
        }
    }

    private static final class PostgresConservado extends PostgreSQLContainer {
        private static final System.Logger LOG =
                System.getLogger(PostgresConservado.class.getName());

        private PostgresConservado(DockerImageName imagen) {
            super(imagen);
            withReuse(true);
            withLabel("gestion.qa.conservar", "true");
            // Aislamiento: nunca reutilizar datos de otra instancia o ejecución de prueba.
            withLabel("gestion.qa.instancia", UUID.randomUUID().toString());
        }

        @Override
        public void start() {
            validarConservacion();
            if (!isShouldBeReused() || !canBeReused()) {
                throw new IllegalStateException("La instancia QA no permite conservar recursos");
            }
            super.start();
            LOG.log(System.Logger.Level.INFO, "QA_CONTENEDOR_CREADO id={0}", getContainerId());
        }

        @Override
        public void stop() {
            var id = getContainerId();
            if (id == null) return;
            var estado = getDockerClient().inspectContainerCmd(id).exec().getState();
            if (Boolean.TRUE.equals(estado.getRunning())) {
                getDockerClient().stopContainerCmd(id).withTimeout(5).exec();
            }
            // close() delega a este método: repetir el cierre conserva el mismo recurso.
            var finalEstado = getDockerClient().inspectContainerCmd(id).exec().getState();
            LOG.log(
                    System.Logger.Level.INFO,
                    "QA_CONTENEDOR_CONSERVADO id={0} estado={1}",
                    id,
                    finalEstado.getStatus());
        }
    }
}
