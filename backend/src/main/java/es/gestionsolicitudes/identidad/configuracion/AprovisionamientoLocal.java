package es.gestionsolicitudes.identidad.configuracion;

import es.gestionsolicitudes.identidad.aplicacion.Contrasenas;
import es.gestionsolicitudes.identidad.aplicacion.RepositorioIdentidad;
import es.gestionsolicitudes.identidad.dominio.Correo;
import es.gestionsolicitudes.identidad.dominio.Rol;
import java.time.Clock;
import java.util.Set;
import java.util.UUID;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Component
@Profile("local")
public class AprovisionamientoLocal implements ApplicationRunner {
    private final Environment entorno;
    private final RepositorioIdentidad repositorio;
    private final Contrasenas contrasenas;
    private final Clock reloj;
    private final TransactionTemplate transaccion;

    public AprovisionamientoLocal(
            Environment entorno,
            RepositorioIdentidad repositorio,
            Contrasenas contrasenas,
            Clock reloj,
            PlatformTransactionManager gestor) {
        this.entorno = entorno;
        this.repositorio = repositorio;
        this.contrasenas = contrasenas;
        this.reloj = reloj;
        this.transaccion = new TransactionTemplate(gestor);
    }

    @Override
    public void run(ApplicationArguments argumentos) {
        try {
            transaccion.executeWithoutResult(
                    estado -> {
                        for (Rol rol : Rol.values()) {
                            aprovisionar(rol);
                        }
                    });
        } catch (RuntimeException error) {
            // Las excepciones SQL podrían incluir valores de filas: no publicar la causa.
            throw new IllegalStateException(
                    "Aprovisionamiento local inválido: compruebe grupos DEMO completos, correo, nombre y política de contraseña");
        }
    }

    private void aprovisionar(Rol rol) {
        String prefijo = "DEMO_" + rol.name() + "_";
        String correo = entorno.getProperty(prefijo + "CORREO");
        String nombre = entorno.getProperty(prefijo + "NOMBRE");
        String clave = entorno.getProperty(prefijo + "CLAVE");
        if (ausente(correo) && ausente(nombre) && ausente(clave)) {
            return;
        }
        if (correo == null
                || nombre == null
                || clave == null
                || nombre.isBlank()
                || nombre.length() > 120) {
            throw new IllegalArgumentException("Grupo DEMO incompleto o inválido");
        }
        String normalizado = Correo.normalizar(correo);
        contrasenas.validar(clave);
        if (repositorio.buscarUsuario(normalizado, false).isEmpty()) {
            repositorio.crearUsuario(
                    UUID.randomUUID(),
                    normalizado,
                    nombre,
                    contrasenas.codificar(clave),
                    Set.of(rol),
                    reloj.instant().truncatedTo(java.time.temporal.ChronoUnit.SECONDS));
        }
    }

    private boolean ausente(String valor) {
        return valor == null || valor.isEmpty();
    }
}
