package es.gestionsolicitudes.identidad.configuracion;

import es.gestionsolicitudes.identidad.aplicacion.RepositorioIdentidad;
import es.gestionsolicitudes.identidad.dominio.Rol;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

public class ValidadorJwt implements OAuth2TokenValidator<Jwt> {
    private final RepositorioIdentidad repositorio;
    private final Clock reloj;
    private final boolean demo;

    public ValidadorJwt(RepositorioIdentidad repositorio, Clock reloj) {
        this(repositorio, reloj, false);
    }

    public ValidadorJwt(RepositorioIdentidad repositorio, Clock reloj, boolean demo) {
        this.repositorio = repositorio;
        this.reloj = reloj;
        this.demo = demo;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        try {
            if (demo) {
                var contexto = es.gestionsolicitudes.demo.dominio.ContextoDemo.actual();
                if (contexto == null
                        || !contexto.reservaId()
                                .toString()
                                .equals(token.getClaimAsString("demo_reserva"))
                        || !contexto.espacio().equals(token.getClaimAsString("demo_espacio"))
                        || !contexto.generacion()
                                .toString()
                                .equals(token.getClaimAsString("demo_generacion")))
                    return rechazo();
            }
            Instant ahora = reloj.instant();
            Instant emision = token.getIssuedAt();
            Instant inicio = token.getNotBefore();
            Instant fin = token.getExpiresAt();
            Object roles = token.getClaims().get("roles");
            if (!"RS256".equals(token.getHeaders().get("alg"))
                    || !"gestion-solicitudes".equals(token.getClaimAsString("iss"))
                    || !List.of("gestion-solicitudes-api").equals(token.getAudience())
                    || emision == null
                    || inicio == null
                    || fin == null
                    || emision.isAfter(ahora)
                    || inicio.isAfter(ahora)
                    || !fin.isAfter(ahora)
                    || inicio.isBefore(emision)
                    || !fin.isAfter(inicio)
                    || !(roles instanceof List<?> lista)
                    || lista.isEmpty()
                    || !lista.stream().allMatch(this::rolValido)) {
                return rechazo();
            }
            uuid(token.getId());
            UUID usuario = uuid(token.getSubject());
            UUID sesion = uuid(token.getClaimAsString("sid"));
            return repositorio.sesionActiva(sesion, usuario, ahora)
                    ? OAuth2TokenValidatorResult.success()
                    : rechazo();
        } catch (DataAccessException error) {
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("dependency_unavailable", "DEPENDENCIA_NO_DISPONIBLE", null));
        } catch (IllegalArgumentException error) {
            return rechazo();
        }
    }

    private UUID uuid(String valor) {
        if (valor == null) {
            throw new IllegalArgumentException("Claim obligatorio ausente");
        }
        UUID id = UUID.fromString(valor);
        if (!id.toString().equals(valor)) {
            throw new IllegalArgumentException("UUID no canónico");
        }
        return id;
    }

    private boolean rolValido(Object valor) {
        if (!(valor instanceof String nombre)) {
            return false;
        }
        try {
            Rol.valueOf(nombre);
            return true;
        } catch (IllegalArgumentException error) {
            return false;
        }
    }

    private OAuth2TokenValidatorResult rechazo() {
        return OAuth2TokenValidatorResult.failure(
                new OAuth2Error("invalid_token", "NO_AUTENTICADO", null));
    }
}
