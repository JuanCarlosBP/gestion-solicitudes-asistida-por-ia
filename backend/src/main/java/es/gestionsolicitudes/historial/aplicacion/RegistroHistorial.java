package es.gestionsolicitudes.historial.aplicacion;

import es.gestionsolicitudes.historial.dominio.CambioHistorial;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
public class RegistroHistorial {
    private final RepositorioHistorial repositorio;

    public RegistroHistorial(RepositorioHistorial repositorio) {
        this.repositorio = repositorio;
    }

    /** Exige la transacción del efecto; nunca inicia una escritura independiente. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void registrar(CambioHistorial cambio) {
        repositorio.insertar(cambio);
    }
}
