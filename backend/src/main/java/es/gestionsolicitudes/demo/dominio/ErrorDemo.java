package es.gestionsolicitudes.demo.dominio;

public final class ErrorDemo extends RuntimeException {
    private final int estado;
    private final String codigo;

    public ErrorDemo(int estado, String codigo) {
        super(codigo);
        this.estado = estado;
        this.codigo = codigo;
    }

    public int estado() {
        return estado;
    }

    public String codigo() {
        return codigo;
    }

    public static ErrorDemo invalida() {
        return new ErrorDemo(401, "DEMO_RESERVA_INVALIDA");
    }
}
