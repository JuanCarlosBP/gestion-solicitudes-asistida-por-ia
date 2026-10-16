package es.gestionsolicitudes.configuracion;

import es.gestionsolicitudes.identidad.http.CookiesIdentidad;
import es.gestionsolicitudes.identidad.http.RepositorioCsrfPorEntorno;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.ObjectPostProcessor;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SeguridadTecnica {
    @Bean
    SecurityFilterChain cadenaTecnica(
            HttpSecurity http, Environment entorno, CookiesIdentidad cookies) throws Exception {
        http.authorizeHttpRequests(
                        reglas -> {
                            reglas.requestMatchers(
                                            HttpMethod.GET, "/api/salud", "/api/autenticacion/csrf")
                                    .permitAll();
                            reglas.requestMatchers(
                                            HttpMethod.POST,
                                            "/api/autenticacion/iniciar-sesion",
                                            "/api/autenticacion/renovar",
                                            "/api/autenticacion/cerrar-sesion")
                                    .permitAll();
                            if (entorno.acceptsProfiles(Profiles.of("local", "test"))) {
                                reglas.requestMatchers(
                                                HttpMethod.GET,
                                                "/v3/api-docs",
                                                "/v3/api-docs/swagger-config",
                                                "/swagger-ui.html",
                                                "/swagger-ui/**")
                                        .permitAll();
                            }
                            reglas.requestMatchers(
                                            HttpMethod.GET,
                                            "/api/proveedores",
                                            "/api/proveedores/*")
                                    .hasAnyRole(
                                            "SOLICITANTE",
                                            "SUPERVISOR",
                                            "AUDITOR",
                                            "ADMINISTRADOR");
                            reglas.requestMatchers(
                                            HttpMethod.POST,
                                            "/api/proveedores",
                                            "/api/proveedores/*/desactivar",
                                            "/api/proveedores/*/reactivar")
                                    .hasRole("ADMINISTRADOR");
                            reglas.requestMatchers(HttpMethod.PUT, "/api/proveedores/*")
                                    .hasRole("ADMINISTRADOR");
                            reglas.requestMatchers(
                                            HttpMethod.GET,
                                            "/api/solicitudes",
                                            "/api/solicitudes/*")
                                    .hasAnyRole(
                                            "SOLICITANTE",
                                            "SUPERVISOR",
                                            "AUDITOR",
                                            "ADMINISTRADOR");
                            reglas.requestMatchers(
                                            HttpMethod.POST,
                                            "/api/solicitudes",
                                            "/api/solicitudes/*/presentar")
                                    .hasRole("SOLICITANTE");
                            reglas.requestMatchers(HttpMethod.PUT, "/api/solicitudes/*")
                                    .hasRole("SOLICITANTE");
                            reglas.requestMatchers(
                                            HttpMethod.POST,
                                            "/api/solicitudes/*/aprobar",
                                            "/api/solicitudes/*/rechazar")
                                    .hasRole("SUPERVISOR");
                            reglas.requestMatchers(
                                            HttpMethod.GET,
                                            "/api/identidad/yo",
                                            "/api/identidad/supervisores",
                                            "/api/operaciones-idempotentes/*")
                                    .authenticated()
                                    .anyRequest()
                                    .denyAll();
                        })
                .sessionManagement(
                        sesion -> sesion.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .oauth2ResourceServer(
                        recurso ->
                                recurso.jwt(jwt -> jwt.jwtAuthenticationConverter(conversorJwt()))
                                        .authenticationEntryPoint(
                                                (peticion, respuesta, error) ->
                                                        errorAutenticacion(respuesta, error))
                                        .accessDeniedHandler(
                                                (peticion, respuesta, error) ->
                                                        error(
                                                                respuesta,
                                                                403,
                                                                "ACCESO_NO_PERMITIDO")))
                .csrf(
                        csrf -> {
                            var manejador = new CsrfTokenRequestAttributeHandler();
                            // Materializa también el token rotado tras autenticar Bearer. Sin
                            // ello Spring borra la cookie y difiere su reposición, dejando al
                            // navegador sin token para la siguiente escritura. Conserva la
                            // rotación y la comprobación de cookie + cabecera en cada mutable.
                            manejador.setCsrfRequestAttributeName(null);
                            csrf.csrfTokenRepository(new RepositorioCsrfPorEntorno(cookies))
                                    .csrfTokenRequestHandler(manejador);
                            // Resource Server añade una exclusión Bearer durante init. Se
                            // restablece el
                            // matcher final para que TODO método mutable exija XSRF, también con
                            // Bearer.
                            csrf.addObjectPostProcessor(
                                    new ObjectPostProcessor<CsrfFilter>() {
                                        @Override
                                        public <O extends CsrfFilter> O postProcess(O filtro) {
                                            filtro.setRequireCsrfProtectionMatcher(
                                                    CsrfFilter.DEFAULT_CSRF_MATCHER);
                                            return filtro;
                                        }
                                    });
                        })
                .exceptionHandling(
                        errores ->
                                errores.authenticationEntryPoint(
                                                (peticion, respuesta, error) ->
                                                        errorAutenticacion(respuesta, error))
                                        .accessDeniedHandler(
                                                (peticion, respuesta, error) ->
                                                        error(
                                                                respuesta,
                                                                403,
                                                                "ACCESO_NO_PERMITIDO")))
                .headers(
                        cabeceras ->
                                cabeceras
                                        .contentSecurityPolicy(
                                                csp ->
                                                        csp.policyDirectives(
                                                                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'"))
                                        .referrerPolicy(
                                                referer ->
                                                        referer.policy(
                                                                org.springframework.security.web
                                                                        .header.writers
                                                                        .ReferrerPolicyHeaderWriter
                                                                        .ReferrerPolicy
                                                                        .NO_REFERRER)));
        return http.build();
    }

    public static JwtAuthenticationConverter conversorJwt() {
        var roles = new JwtGrantedAuthoritiesConverter();
        roles.setAuthoritiesClaimName("roles");
        roles.setAuthorityPrefix("ROLE_");
        var conversor = new JwtAuthenticationConverter();
        conversor.setJwtGrantedAuthoritiesConverter(roles);
        return conversor;
    }

    private static void error(HttpServletResponse respuesta, int estado, String codigo)
            throws IOException {
        respuesta.setStatus(estado);
        respuesta.setContentType("application/json");
        respuesta.setCharacterEncoding("UTF-8");
        respuesta.getWriter().write("{\"error\":\"" + codigo + "\"}");
    }

    private static void errorAutenticacion(HttpServletResponse respuesta, Exception error)
            throws IOException {
        for (Throwable causa = error; causa != null; causa = causa.getCause()) {
            if (causa
                            instanceof
                            org.springframework.security.oauth2.jwt.JwtValidationException
                                    validacion
                    && validacion.getErrors().stream()
                            .anyMatch(e -> "dependency_unavailable".equals(e.getErrorCode()))) {
                error(respuesta, 503, "DEPENDENCIA_NO_DISPONIBLE");
                return;
            }
        }
        error(respuesta, 401, "NO_AUTENTICADO");
    }
}
