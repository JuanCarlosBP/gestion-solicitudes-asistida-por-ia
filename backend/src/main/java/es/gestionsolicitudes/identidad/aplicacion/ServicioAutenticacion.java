package es.gestionsolicitudes.identidad.aplicacion;

import es.gestionsolicitudes.identidad.configuracion.DuracionesIdentidad;
import es.gestionsolicitudes.identidad.dominio.*;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioAutenticacion {
    private static final Logger LOG = LoggerFactory.getLogger(ServicioAutenticacion.class);
    private final RepositorioIdentidad repositorio;
    private final Contrasenas contrasenas;
    private final SecretosRefresco secretos;
    private final EmisorJwt emisor;
    private final Clock reloj;
    private final DuracionesIdentidad duraciones;

    public ServicioAutenticacion(
            RepositorioIdentidad repositorio,
            Contrasenas contrasenas,
            SecretosRefresco secretos,
            EmisorJwt emisor,
            Clock reloj,
            DuracionesIdentidad duraciones) {
        this.repositorio = repositorio;
        this.contrasenas = contrasenas;
        this.secretos = secretos;
        this.emisor = emisor;
        this.reloj = reloj;
        this.duraciones = duraciones;
    }

    @Transactional
    public Optional<AccesoEmitido> iniciar(String correoEntrada, String clave) {
        String correo;
        try {
            correo = Correo.normalizar(correoEntrada);
        } catch (IllegalArgumentException error) {
            contrasenas.verificarFicticia(clave);
            return loginFallido();
        }
        var encontrado = repositorio.buscarUsuario(correo, true);
        if (encontrado.isEmpty()) {
            contrasenas.verificarFicticia(clave);
            return loginFallido();
        }
        Usuario usuario = encontrado.get();
        // También se calcula el hash de cuentas bloqueadas/deshabilitadas; no se promete tiempo
        // idéntico.
        boolean correcta = contrasenas.verificar(clave, usuario.claveHash());
        Instant ahora = ahora();
        if (!usuario.habilitado() || usuario.intentos().bloqueado(ahora)) {
            return loginFallido();
        }
        if (!correcta) {
            var intentos = usuario.intentos().fallo(ahora);
            repositorio.guardarIntentos(usuario.publico().id(), intentos, ahora);
            if (intentos.bloqueado(ahora)) {
                LOG.warn("IDENTIDAD_BLOQUEO_TEMPORAL usuarioId={}", usuario.publico().id());
            }
            return loginFallido();
        }
        repositorio.guardarIntentos(usuario.publico().id(), IntentosAcceso.vacios(), ahora);
        var credencial = secretos.nueva();
        var sesion =
                new SesionAcceso(
                        UUID.randomUUID(),
                        usuario.publico().id(),
                        UUID.randomUUID(),
                        credencial.id(),
                        ahora,
                        ahora.plus(duraciones.refresco()),
                        null);
        repositorio.crearSesion(sesion);
        repositorio.crearToken(token(credencial, sesion, ahora));
        LOG.info(
                "IDENTIDAD_SESION_INICIADA usuarioId={} sesionId={}",
                usuario.publico().id(),
                sesion.id());
        return Optional.of(
                emisor.emitir(usuario.publico(), sesion, credencial.valorCookie(), ahora));
    }

    @Transactional
    public Optional<AccesoEmitido> renovar(String valorCookie) {
        var credencial = secretos.interpretar(valorCookie);
        if (credencial.isEmpty()) {
            return Optional.empty();
        }
        var previo = repositorio.buscarToken(credencial.get().id());
        if (previo.isEmpty()) {
            return Optional.empty();
        }
        // Todos los consumidores, incluido logout, bloquean la sesión antes de releer el token.
        var sesion = repositorio.bloquearSesion(previo.get().sesionId()).orElseThrow();
        var actual = repositorio.buscarToken(credencial.get().id()).orElseThrow();
        if (!credencial.get().coincide(actual.secretoHash())) {
            return Optional.empty();
        }
        Instant ahora = ahora();
        if ("USADO".equals(actual.estado())) {
            repositorio.revocar(sesion, ahora, "REUTILIZACION");
            LOG.warn("IDENTIDAD_REFRESH_REUTILIZADO sesionId={}", sesion.id());
            // Devolver valor evita que una excepción de autenticación revierta la revocación.
            return Optional.empty();
        }
        if (!sesion.activa(ahora)
                || !"ACTIVO".equals(actual.estado())
                || !actual.id().equals(sesion.tokenActual())) {
            return Optional.empty();
        }
        Usuario usuario = repositorio.buscarUsuario(sesion.usuarioId()).orElseThrow();
        if (!usuario.habilitado()) {
            repositorio.revocar(sesion, ahora, "USUARIO_DESHABILITADO");
            return Optional.empty();
        }
        var siguiente = secretos.nueva();
        repositorio.crearToken(token(siguiente, sesion, ahora));
        repositorio.rotar(sesion, actual.id(), siguiente.id(), ahora);
        return Optional.of(
                emisor.emitir(usuario.publico(), sesion, siguiente.valorCookie(), ahora));
    }

    @Transactional
    public void cerrar(String valorCookie) {
        var credencial = secretos.interpretar(valorCookie);
        if (credencial.isEmpty()) {
            return;
        }
        var token = repositorio.buscarToken(credencial.get().id());
        if (token.isEmpty()) {
            return;
        }
        var sesion = repositorio.bloquearSesion(token.get().sesionId()).orElseThrow();
        if (credencial.get().coincide(token.get().secretoHash())) {
            repositorio.revocar(sesion, ahora(), "CIERRE");
            LOG.info("IDENTIDAD_SESION_CERRADA sesionId={}", sesion.id());
        }
    }

    @Transactional(readOnly = true)
    public Optional<UsuarioPublico> identidad(UUID id) {
        return repositorio.buscarUsuario(id).filter(Usuario::habilitado).map(Usuario::publico);
    }

    private Optional<AccesoEmitido> loginFallido() {
        LOG.info("IDENTIDAD_LOGIN_RECHAZADO");
        return Optional.empty();
    }

    private TokenRefresco token(
            SecretosRefresco.Credencial credencial, SesionAcceso sesion, Instant ahora) {
        return new TokenRefresco(
                credencial.id(),
                sesion.id(),
                sesion.familiaId(),
                credencial.hash(),
                "ACTIVO",
                ahora,
                sesion.expiraEn());
    }

    private Instant ahora() {
        return reloj.instant().truncatedTo(ChronoUnit.SECONDS);
    }
}
