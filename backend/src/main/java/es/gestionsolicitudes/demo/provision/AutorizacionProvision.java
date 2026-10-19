package es.gestionsolicitudes.demo.provision;

/** Autoriza únicamente entornos conocidos; nunca sustituye los controles de cada base. */
final class AutorizacionProvision {
    static final String CONFIRMACION = "RECREAR_SOLO_BASES_DEMO_FICTICIAS";

    private AutorizacionProvision() {}

    static void exigir(String entorno, String confirmacion) {
        if ("local".equals(entorno)) return;
        if ("publico".equals(entorno) && CONFIRMACION.equals(confirmacion)) return;
        throw new IllegalStateException("Provisión no autorizada para este entorno");
    }
}
