package es.gestionsolicitudes.identidad.aplicacion;

import es.gestionsolicitudes.identidad.configuracion.DuracionesIdentidad;
import es.gestionsolicitudes.identidad.dominio.SesionAcceso;
import es.gestionsolicitudes.identidad.dominio.UsuarioPublico;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

@Component
public class EmisorJwt {
    private final JwtEncoder codificador;
    private final DuracionesIdentidad duraciones;

    public EmisorJwt(JwtEncoder codificador, DuracionesIdentidad duraciones) {
        this.codificador = codificador;
        this.duraciones = duraciones;
    }

    public AccesoEmitido emitir(
            UsuarioPublico usuario, SesionAcceso sesion, String refresh, Instant ahora) {
        Instant fin = ahora.plus(duraciones.acceso());
        if (fin.isAfter(sesion.expiraEn())) {
            fin = sesion.expiraEn();
        }
        var claims =
                JwtClaimsSet.builder()
                        .issuer("gestion-solicitudes")
                        .audience(List.of("gestion-solicitudes-api"))
                        .subject(usuario.id().toString())
                        .issuedAt(ahora)
                        .notBefore(ahora)
                        .expiresAt(fin)
                        .id(UUID.randomUUID().toString())
                        .claim("sid", sesion.id().toString())
                        .claim("roles", usuario.roles().stream().map(Enum::name).sorted().toList())
                        .build();
        String acceso =
                codificador
                        .encode(
                                JwtEncoderParameters.from(
                                        JwsHeader.with(SignatureAlgorithm.RS256).build(), claims))
                        .getTokenValue();
        return new AccesoEmitido(
                acceso,
                java.time.Duration.between(ahora, fin).toSeconds(),
                usuario,
                refresh,
                sesion.expiraEn());
    }
}
