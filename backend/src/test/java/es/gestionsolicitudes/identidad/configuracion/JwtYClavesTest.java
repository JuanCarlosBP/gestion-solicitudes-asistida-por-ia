package es.gestionsolicitudes.identidad.configuracion;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import es.gestionsolicitudes.configuracion.SeguridadTecnica;
import es.gestionsolicitudes.identidad.aplicacion.EmisorJwt;
import es.gestionsolicitudes.identidad.aplicacion.RepositorioIdentidad;
import es.gestionsolicitudes.identidad.dominio.Rol;
import es.gestionsolicitudes.identidad.dominio.SesionAcceso;
import es.gestionsolicitudes.identidad.dominio.UsuarioPublico;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;

class JwtYClavesTest {
    private final Instant ahora = Instant.parse("2026-10-14T00:00:00Z");
    private final Clock reloj = Clock.fixed(ahora, ZoneOffset.UTC);
    private final ConfiguracionIdentidad configuracion = new ConfiguracionIdentidad();

    private MockEnvironment entornoTest() {
        var entorno = new MockEnvironment();
        entorno.setActiveProfiles("test");
        return entorno;
    }

    private Map<String, Object> claims() {
        return new HashMap<>(
                Map.of(
                        "iss",
                        "gestion-solicitudes",
                        "aud",
                        List.of("gestion-solicitudes-api"),
                        "sub",
                        UUID.randomUUID().toString(),
                        "sid",
                        UUID.randomUUID().toString(),
                        "jti",
                        UUID.randomUUID().toString(),
                        "iat",
                        ahora,
                        "nbf",
                        ahora,
                        "exp",
                        ahora.plusSeconds(600),
                        "roles",
                        List.of("SOLICITANTE", "AUDITOR")));
    }

    private Jwt jwt(Map<String, Object> claims) {
        return new Jwt(
                "token-ficticio-no-firmado",
                (Instant) claims.get("iat"),
                (Instant) claims.get("exp"),
                Map.of("alg", "RS256"),
                claims);
    }

    @Test
    void emiteRs256ConClaimsMinimosYConvierteRoles() {
        var claves = ClavesRsa.cargar(entornoTest());
        var repositorio = mock(RepositorioIdentidad.class);
        when(repositorio.sesionActiva(any(), any(), any())).thenReturn(true);
        var encoder = configuracion.codificadorJwt(claves);
        var decoder = configuracion.decodificadorJwt(claves, repositorio, reloj);
        var duraciones = new DuracionesIdentidad(Duration.ofMinutes(10), Duration.ofHours(8));
        var usuario =
                new UsuarioPublico(
                        UUID.randomUUID(),
                        "cuenta@ejemplo.invalid",
                        "Cuenta",
                        Set.of(Rol.SOLICITANTE, Rol.AUDITOR));
        var sesion =
                new SesionAcceso(
                        UUID.randomUUID(),
                        usuario.id(),
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        ahora,
                        ahora.plusSeconds(28800),
                        null);
        var acceso = new EmisorJwt(encoder, duraciones).emitir(usuario, sesion, "no-real", ahora);
        Jwt token = decoder.decode(acceso.accessToken());
        assertThat(token.getClaims().keySet())
                .containsExactlyInAnyOrder(
                        "iss", "aud", "sub", "iat", "nbf", "exp", "jti", "sid", "roles");
        assertThat(token.getHeaders().get("alg")).isEqualTo("RS256");
        assertThat(token.getSubject()).isEqualTo(usuario.id().toString());
        assertThat(token.getExpiresAt()).isEqualTo(ahora.plusSeconds(600));
        assertThat(acceso.expiraEn()).isEqualTo(600);
        assertThat(
                        SeguridadTecnica.conversorJwt().convert(token).getAuthorities().stream()
                                .map(GrantedAuthority::getAuthority))
                .containsExactlyInAnyOrder("ROLE_SOLICITANTE", "ROLE_AUDITOR", "FACTOR_BEARER");
    }

    @Test
    void rechazaIssuerAudienceFechasClaimsAusentesYRolesAjenos() {
        var repositorio = mock(RepositorioIdentidad.class);
        when(repositorio.sesionActiva(any(), any(), any())).thenReturn(true);
        var validador = new ValidadorJwt(repositorio, reloj);
        assertThat(validador.validate(jwt(claims())).hasErrors()).isFalse();
        var incorrectos =
                Map.of(
                        "iss",
                        "otro",
                        "aud",
                        List.of("otra-api"),
                        "sub",
                        "no-uuid",
                        "sid",
                        "no-uuid",
                        "jti",
                        "no-uuid",
                        "nbf",
                        ahora.plusSeconds(5),
                        "exp",
                        ahora.minusSeconds(5),
                        "roles",
                        List.of("DUEÑO"));
        for (var entrada : incorrectos.entrySet()) {
            var datos = claims();
            if (entrada.getKey().equals("exp")) {
                datos.put("iat", ahora.minusSeconds(600));
                datos.put("nbf", ahora.minusSeconds(600));
            }
            datos.put(entrada.getKey(), entrada.getValue());
            assertThat(validador.validate(jwt(datos)).hasErrors())
                    .as("claim rechazado: %s", entrada.getKey())
                    .isTrue();
        }
        for (String obligatorio :
                List.of("iss", "aud", "sub", "sid", "jti", "iat", "nbf", "exp", "roles")) {
            var datos = claims();
            datos.remove(obligatorio);
            assertThat(validador.validate(jwt(datos)).hasErrors())
                    .as("claim obligatorio: %s", obligatorio)
                    .isTrue();
        }
        for (Object invalido : List.of(List.of(), "ADMINISTRADOR", List.of(5))) {
            var datos = claims();
            datos.put("roles", invalido);
            assertThat(validador.validate(jwt(datos)).hasErrors()).isTrue();
        }
        var futuro = claims();
        futuro.put("iat", ahora.plusSeconds(1));
        futuro.put("nbf", ahora.plusSeconds(1));
        assertThat(validador.validate(jwt(futuro)).hasErrors()).isTrue();
    }

    @Test
    void sesionInactivaOBaseInaccesibleRechazanElToken() {
        var repositorio = mock(RepositorioIdentidad.class);
        var validador = new ValidadorJwt(repositorio, reloj);
        assertThat(validador.validate(jwt(claims())).hasErrors()).isTrue();
        when(repositorio.sesionActiva(any(), any(), any()))
                .thenThrow(
                        new org.springframework.dao.DataAccessResourceFailureException(
                                "fallo de prueba"));
        assertThat(validador.validate(jwt(claims())).hasErrors()).isTrue();
    }

    @Test
    void firmaAlteradaClaveAjenaYAlgoritmoDistintoNoSeAceptan() {
        var claves = ClavesRsa.cargar(entornoTest());
        var repositorio = mock(RepositorioIdentidad.class);
        when(repositorio.sesionActiva(any(), any(), any())).thenReturn(true);
        var encoder = configuracion.codificadorJwt(claves);
        var decoder = configuracion.decodificadorJwt(claves, repositorio, reloj);
        var payload = JwtClaimsSet.builder().claims(mapa -> mapa.putAll(claims())).build();
        String token =
                encoder.encode(
                                JwtEncoderParameters.from(
                                        JwsHeader.with(SignatureAlgorithm.RS256).build(), payload))
                        .getTokenValue();
        int inicioFirma = token.lastIndexOf('.') + 1;
        String alterado =
                token.substring(0, inicioFirma)
                        + (token.charAt(inicioFirma) == 'A' ? 'B' : 'A')
                        + token.substring(inicioFirma + 1);
        assertThatThrownBy(() -> decoder.decode(alterado)).isInstanceOf(JwtException.class);
        var ajeno =
                configuracion.decodificadorJwt(ClavesRsa.cargar(entornoTest()), repositorio, reloj);
        assertThatThrownBy(() -> ajeno.decode(token)).isInstanceOf(JwtException.class);
        String rs512 =
                encoder.encode(
                                JwtEncoderParameters.from(
                                        JwsHeader.with(SignatureAlgorithm.RS512).build(), payload))
                        .getTokenValue();
        assertThatThrownBy(() -> decoder.decode(rs512)).isInstanceOf(JwtException.class);
        String ninguno =
                Base64.getUrlEncoder()
                                .withoutPadding()
                                .encodeToString(
                                        "{\"alg\":\"none\"}"
                                                .getBytes(java.nio.charset.StandardCharsets.UTF_8))
                        + "."
                        + token.split("\\.")[1]
                        + ".";
        assertThatThrownBy(() -> decoder.decode(ninguno)).isInstanceOf(JwtException.class);
    }

    @Test
    void normalExigeClavesExternasYLocalTestGeneranRsaEfimera() {
        assertThatThrownBy(() -> ClavesRsa.cargar(new MockEnvironment()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Claves RSA externas ausentes o inválidas");
        for (String perfil : List.of("local", "test")) {
            var entorno = new MockEnvironment();
            entorno.setActiveProfiles(perfil);
            var primera = ClavesRsa.cargar(entorno);
            var segunda = ClavesRsa.cargar(entorno);
            assertThat(primera.publica().getModulus().bitLength()).isEqualTo(2048);
            assertThat(primera.publica().getModulus().equals(segunda.publica().getModulus()))
                    .isFalse();
        }
        var invalido =
                new MockEnvironment()
                        .withProperty("IDENTIDAD_CLAVE_PRIVADA_PEM", "contenido-no-pem")
                        .withProperty("IDENTIDAD_CLAVE_PUBLICA_PEM", "contenido-no-pem");
        assertThatThrownBy(() -> ClavesRsa.cargar(invalido))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageNotContaining("contenido-no-pem");
    }

    @Test
    void normalCargaPkcs8X509PorValorYPorRutaSinRegistrarClaves(@TempDir Path temporal)
            throws Exception {
        var original = ClavesRsa.cargar(entornoTest());
        String privada = pem("PRIVATE KEY", original.privada().getEncoded());
        String publica = pem("PUBLIC KEY", original.publica().getEncoded());
        var entorno =
                new MockEnvironment()
                        .withProperty("IDENTIDAD_CLAVE_PRIVADA_PEM", privada)
                        .withProperty("IDENTIDAD_CLAVE_PUBLICA_PEM", publica);
        assertThat(
                        ClavesRsa.cargar(entorno)
                                .publica()
                                .getModulus()
                                .equals(original.publica().getModulus()))
                .isTrue();
        Path rutaPrivada = temporal.resolve("privada-efimera.pem");
        Path rutaPublica = temporal.resolve("publica-efimera.pem");
        Files.writeString(rutaPrivada, privada);
        Files.writeString(rutaPublica, publica);
        var rutas =
                new MockEnvironment()
                        .withProperty("IDENTIDAD_CLAVE_PRIVADA_RUTA", rutaPrivada.toString())
                        .withProperty("IDENTIDAD_CLAVE_PUBLICA_RUTA", rutaPublica.toString());
        assertThat(
                        ClavesRsa.cargar(rutas)
                                .publica()
                                .getModulus()
                                .equals(original.publica().getModulus()))
                .isTrue();
        var distinta = ClavesRsa.cargar(entornoTest());
        entorno.setProperty(
                "IDENTIDAD_CLAVE_PUBLICA_PEM", pem("PUBLIC KEY", distinta.publica().getEncoded()));
        assertThatThrownBy(() -> ClavesRsa.cargar(entorno))
                .isInstanceOf(IllegalStateException.class);
    }

    private String pem(String tipo, byte[] valor) {
        return "-----BEGIN "
                + tipo
                + "-----\n"
                + Base64.getMimeEncoder().encodeToString(valor)
                + "\n-----END "
                + tipo
                + "-----";
    }

    @Test
    void rechazaPublicaConMismoModuloPeroExponenteIncompatible() throws Exception {
        var par = ClavesRsa.cargar(entornoTest());
        var publicaAjena =
                java.security.KeyFactory.getInstance("RSA")
                        .generatePublic(
                                new java.security.spec.RSAPublicKeySpec(
                                        par.publica().getModulus(),
                                        java.math.BigInteger.valueOf(3)));
        var entorno =
                new MockEnvironment()
                        .withProperty(
                                "IDENTIDAD_CLAVE_PRIVADA_PEM",
                                pem("PRIVATE KEY", par.privada().getEncoded()))
                        .withProperty(
                                "IDENTIDAD_CLAVE_PUBLICA_PEM",
                                pem("PUBLIC KEY", publicaAjena.getEncoded()));
        assertThatThrownBy(() -> ClavesRsa.cargar(entorno))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Claves RSA externas ausentes o inválidas");
    }
}
