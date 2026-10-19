package es.gestionsolicitudes.identidad.configuracion;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import es.gestionsolicitudes.identidad.aplicacion.RepositorioIdentidad;
import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

@Configuration
public class ConfiguracionIdentidad {
    @Bean
    Clock relojIdentidad() {
        return Clock.systemUTC();
    }

    @Bean
    DuracionesIdentidad duracionesIdentidad(
            @Value("${identidad.duracion-acceso:PT10M}") Duration acceso,
            @Value("${identidad.duracion-refresco:PT8H}") Duration refresco) {
        return new DuracionesIdentidad(acceso, refresco);
    }

    @Bean
    ClavesRsa clavesIdentidad(Environment entorno) {
        return ClavesRsa.cargar(entorno);
    }

    @Bean
    JwtEncoder codificadorJwt(ClavesRsa claves) {
        RSAKey llave = new RSAKey.Builder(claves.publica()).privateKey(claves.privada()).build();
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(llave)));
    }

    @Bean
    JwtDecoder decodificadorJwt(
            ClavesRsa claves, RepositorioIdentidad repositorio, Clock reloj, Environment entorno) {
        NimbusJwtDecoder decodificador =
                NimbusJwtDecoder.withPublicKey(claves.publica())
                        .signatureAlgorithm(SignatureAlgorithm.RS256)
                        .build();
        decodificador.setJwtValidator(
                new ValidadorJwt(
                        repositorio,
                        reloj,
                        entorno.acceptsProfiles(org.springframework.core.env.Profiles.of("demo"))));
        return decodificador;
    }

    JwtDecoder decodificadorJwt(ClavesRsa claves, RepositorioIdentidad repositorio, Clock reloj) {
        return decodificadorJwt(
                claves, repositorio, reloj, new org.springframework.core.env.StandardEnvironment());
    }
}
