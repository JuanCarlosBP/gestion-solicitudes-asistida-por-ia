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
        String proyecto = System.getenv("GESTION_QA_PROYECTO_AG016");
        if (proyecto != null
                && (!"gestion-solicitudes-ag016".equals(proyecto)
                        || !Boolean.parseBoolean(
                                System.getenv("GESTION_QA_CONSERVAR_CONTENEDORES"))))
            throw new IllegalStateException(
                    "QA AG-016 exige proyecto exacto y conservación de recursos");
        PostgreSQLContainer base;
        if (!Boolean.parseBoolean(System.getenv("GESTION_QA_CONSERVAR_CONTENEDORES"))) {
            base = new PostgreSQLContainer(imagen);
        } else {
            validarConservacion();
            base = new PostgresConservado(imagen);
        }
        if (proyecto != null) {
            if (!"gestion-solicitudes-ag016".equals(proyecto))
                throw new IllegalStateException("Proyecto QA AG-016 inválido");
            base.withLabel("gestion.qa.proyecto", proyecto);
            base.withCreateContainerCmdModifier(
                    comando -> comando.withName("ag016-qa-" + UUID.randomUUID()));
        }
        return base;
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
        private final String instancia = UUID.randomUUID().toString();
        private final String proyecto = System.getenv("GESTION_QA_PROYECTO_AG016");

        private PostgresConservado(DockerImageName imagen) {
            super(imagen);
            withReuse(true);
            withLabel("gestion.qa.conservar", "true");
            withLabel("gestion.qa.tipo", "postgres");
            // Aislamiento: nunca reutilizar datos de otra instancia o ejecución de prueba.
            withLabel("gestion.qa.instancia", instancia);
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
            var inspeccion = getDockerClient().inspectContainerCmd(id).exec();
            validarIdentidad(id, inspeccion);
            var estado = inspeccion.getState();
            if (Boolean.TRUE.equals(estado.getRunning())) {
                getDockerClient().stopContainerCmd(id).withTimeout(5).exec();
            }
            // close() delega a este método: repetir el cierre conserva el mismo recurso.
            var finalInspeccion = getDockerClient().inspectContainerCmd(id).exec();
            validarIdentidad(id, finalInspeccion);
            var finalEstado = finalInspeccion.getState();
            LOG.log(
                    System.Logger.Level.INFO,
                    "QA_CONTENEDOR_CONSERVADO id={0} estado={1}",
                    id,
                    finalEstado.getStatus());
        }

        private void validarIdentidad(
                String id, com.github.dockerjava.api.command.InspectContainerResponse inspeccion) {
            var config = inspeccion.getConfig();
            var etiquetas = config == null ? null : config.getLabels();
            if (!id.matches("[a-f0-9]{64}")
                    || !id.equals(inspeccion.getId())
                    || etiquetas == null
                    || !"true".equals(etiquetas.get("gestion.qa.conservar"))
                    || !"postgres".equals(etiquetas.get("gestion.qa.tipo"))
                    || !instancia.equals(etiquetas.get("gestion.qa.instancia"))
                    || (proyecto != null && !proyecto.equals(etiquetas.get("gestion.qa.proyecto"))))
                throw new IllegalStateException(
                        "Identidad del contenedor QA no coincide; parada denegada");
        }
    }
}
