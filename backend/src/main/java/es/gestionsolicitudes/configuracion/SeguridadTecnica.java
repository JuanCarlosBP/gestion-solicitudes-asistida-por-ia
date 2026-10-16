package es.gestionsolicitudes.configuracion;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SeguridadTecnica {
    @Bean
    SecurityFilterChain cadenaTecnica(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(
                        reglas ->
                                reglas.requestMatchers(
                                                HttpMethod.GET,
                                                "/api/salud",
                                                "/v3/api-docs",
                                                "/v3/api-docs/swagger-config",
                                                "/swagger-ui.html",
                                                "/swagger-ui/**")
                                        .permitAll()
                                        .anyRequest()
                                        .denyAll())
                .sessionManagement(
                        sesion -> sesion.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .exceptionHandling(
                        errores ->
                                errores.authenticationEntryPoint(
                                                (peticion, respuesta, error) -> denegar(respuesta))
                                        .accessDeniedHandler(
                                                (peticion, respuesta, error) -> denegar(respuesta)))
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

    @Bean
    UserDetailsService sinCuentasFuncionales() {
        // Evita credenciales generadas por defecto; 001 no incorpora usuarios ni login.
        return new InMemoryUserDetailsManager();
    }

    private static void denegar(HttpServletResponse respuesta) throws IOException {
        respuesta.setStatus(HttpServletResponse.SC_FORBIDDEN);
        respuesta.setContentType("application/json");
        respuesta.setCharacterEncoding("UTF-8");
        respuesta.getWriter().write("{\"error\":\"ACCESO_NO_PERMITIDO\"}");
    }
}
