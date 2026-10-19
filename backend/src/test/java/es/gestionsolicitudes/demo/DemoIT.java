package es.gestionsolicitudes.demo;

import static org.assertj.core.api.Assertions.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** API real del laboratorio preparado por su único propietario; no gestiona Docker ni bases. */
@EnabledIfEnvironmentVariable(named = "DEMO_QA_ORIGEN", matches = "http://127\\.0\\.0\\.1:[0-9]+")
class DemoIT {
    private final JsonMapper json = JsonMapper.builder().build();
    private final HttpClient cliente = HttpClient.newHttpClient();
    private final String origen = System.getenv("DEMO_QA_ORIGEN");

    private static final class Visitante {
        final Map<String, String> cookies = new HashMap<>();
        String contexto;
        String token;
    }

    @Test
    void tresEspaciosAisladosConSeguridadRealCupoYRevocacion() throws Exception {
        var a = new Visitante();
        var b = new Visitante();
        var c = new Visitante();
        var cuarto = new Visitante();
        assertThat(datos(enviar(a, "GET", "/api/demo", null, null, 200)).get("disponibles").asInt())
                .isEqualTo(3);
        enviar(cuarto, "POST", "/api/demo/reservas", "", null, 403);
        reservar(a);
        reservar(b);
        reservar(c);
        assertThat(a.contexto.equals(b.contexto)).isFalse();
        assertThat(a.contexto.equals(c.contexto)).isFalse();
        enviar(cuarto, "GET", "/api/autenticacion/csrf", null, null, 204);
        enviar(cuarto, "POST", "/api/demo/reservas", "", null, 409);
        // Falta de contexto y selector manipulado: sin credencial nunca se consulta negocio.
        enviar(cuarto, "GET", "/api/proveedores", null, null, 401);
        String selector = a.contexto;
        a.contexto = b.contexto;
        enviar(a, "GET", "/api/demo/reserva", null, null, 401);
        a.contexto = selector;
        acceso(a, "SOLICITANTE");
        acceso(b, "SOLICITANTE");
        acceso(c, "AUDITOR");
        enviar(a, "POST", "/api/demo/acceso", "{\"rol\":\"ADMINISTRADOR\"}", null, 403);
        String tokenA = a.token;
        b.token = tokenA;
        enviar(b, "GET", "/api/identidad/yo", null, null, 401);
        acceso(b, "SOLICITANTE");
        // Cookies de refresh auténticas de A no renuevan en B.
        String refreshB = b.cookies.get("REFRESH-TOKEN");
        b.cookies.put("REFRESH-TOKEN", a.cookies.get("REFRESH-TOKEN"));
        enviar(b, "POST", "/api/autenticacion/renovar", "", null, 401);
        b.cookies.put("REFRESH-TOKEN", refreshB);
        String clave = UUID.randomUUID().toString();
        var creada =
                datos(
                        enviar(
                                a,
                                "POST",
                                "/api/solicitudes",
                                "{\"asunto\":\"Solicitud aislada A\"}",
                                clave,
                                201));
        String idA = creada.get("id").asString();
        assertThat(
                        datos(
                                        enviar(
                                                a,
                                                "POST",
                                                "/api/solicitudes",
                                                "{\"asunto\":\"Solicitud aislada A\"}",
                                                clave,
                                                201))
                                .get("id")
                                .asString())
                .isEqualTo(idA);
        String idB =
                datos(
                                enviar(
                                        b,
                                        "POST",
                                        "/api/solicitudes",
                                        "{\"asunto\":\"Solicitud aislada B\"}",
                                        clave,
                                        201))
                        .get("id")
                        .asString();
        assertThat(idA).isNotEqualTo(idB);
        enviar(b, "GET", "/api/solicitudes/" + idA, null, null, 404);
        acceso(a, "AUDITOR");
        String tokenAuditorA = a.token;
        a.token = tokenA;
        enviar(a, "GET", "/api/identidad/yo", null, null, 401);
        a.token = tokenAuditorA;
        acceso(b, "AUDITOR");
        var historiaA = datos(enviar(a, "GET", "/api/historial", null, null, 200));
        var historiaB = datos(enviar(b, "GET", "/api/historial", null, null, 200));
        assertThat(historiaA.toString().contains(idB)).isFalse();
        assertThat(historiaB.toString().contains(idA)).isFalse();
        assertThat(historiaA.get("totalElementos").asInt()).isEqualTo(1);
        assertThat(historiaB.get("totalElementos").asInt()).isEqualTo(1);
        enviar(a, "GET", "/api/solicitudes/" + idA + "/historial", null, null, 200);
        enviar(b, "GET", "/api/solicitudes/" + idA + "/historial", null, null, 404);
        // Dos logins concurrentes terminan; solo la última transacción conserva sid activo.
        var primera = new Visitante();
        primera.cookies.putAll(b.cookies);
        primera.contexto = b.contexto;
        var segunda = new Visitante();
        segunda.cookies.putAll(b.cookies);
        segunda.contexto = b.contexto;
        try (var hilos = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var inicio = new java.util.concurrent.CountDownLatch(1);
            var uno =
                    hilos.submit(
                            () -> {
                                inicio.await();
                                acceso(primera, "SOLICITANTE");
                                return true;
                            });
            var dos =
                    hilos.submit(
                            () -> {
                                inicio.await();
                                acceso(segunda, "AUDITOR");
                                return true;
                            });
            inicio.countDown();
            assertThat(uno.get(10, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
            assertThat(dos.get(10, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
        }
        int estadoPrimera =
                enviar(primera, "GET", "/api/identidad/yo", null, null, 200, 401).statusCode();
        int estadoSegunda =
                enviar(segunda, "GET", "/api/identidad/yo", null, null, 200, 401).statusCode();
        assertThat(java.util.List.of(estadoPrimera, estadoSegunda))
                .containsExactlyInAnyOrder(200, 401);
        b.token = estadoPrimera == 200 ? primera.token : segunda.token;
        // Bootstrap ignora un Bearer viejo: no intenta consultar sid sin contexto.
        a.token = tokenA;
        enviar(a, "GET", "/api/demo", null, null, 200);
        enviar(a, "GET", "/api/autenticacion/csrf", null, null, 204);
        var vieja = new Visitante();
        vieja.cookies.putAll(a.cookies);
        vieja.contexto = a.contexto;
        vieja.token = tokenA;
        enviar(a, "POST", "/api/demo/reserva/liberar", "", null, 204);
        enviar(vieja, "GET", "/api/identidad/yo", null, null, 401);
        enviar(vieja, "POST", "/api/autenticacion/renovar", "", null, 401);
        enviar(b, "GET", "/api/solicitudes/" + idB, null, null, 200);
        enviar(b, "POST", "/api/demo/reserva/liberar", "", null, 204);
        enviar(c, "POST", "/api/demo/reserva/liberar", "", null, 204);
    }

    private void reservar(Visitante v) throws Exception {
        enviar(v, "GET", "/api/autenticacion/csrf", null, null, 204);
        var reserva = datos(enviar(v, "POST", "/api/demo/reservas", "", null, 201));
        v.contexto =
                reserva.get("espacio").asString()
                        + ":"
                        + reserva.get("generacion").asString()
                        + ":"
                        + reserva.get("reservaId").asString();
    }

    private void acceso(Visitante v, String rol) throws Exception {
        v.token =
                datos(enviar(v, "POST", "/api/demo/acceso", "{\"rol\":\"" + rol + "\"}", null, 200))
                        .get("accessToken")
                        .asString();
    }

    private JsonNode datos(HttpResponse<String> respuesta) {
        return json.readTree(respuesta.body());
    }

    private HttpResponse<String> enviar(
            Visitante v,
            String metodo,
            String ruta,
            String cuerpo,
            String idempotencia,
            int... esperados)
            throws Exception {
        var peticion =
                HttpRequest.newBuilder(URI.create(origen + ruta)).timeout(Duration.ofSeconds(10));
        peticion.method(
                metodo,
                cuerpo == null
                        ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(cuerpo));
        if (cuerpo != null) peticion.header("Content-Type", "application/json");
        if (v.contexto != null) peticion.header("X-Demo-Contexto", v.contexto);
        if (v.token != null
                && !ruta.startsWith("/api/autenticacion/")
                && (!ruta.startsWith("/api/demo/") || ruta.equals("/api/demo")))
            peticion.header("Authorization", "Bearer " + v.token);
        if (!v.cookies.isEmpty())
            peticion.header(
                    "Cookie",
                    v.cookies.entrySet().stream()
                            .map(e -> e.getKey() + "=" + e.getValue())
                            .collect(java.util.stream.Collectors.joining("; ")));
        if (!metodo.equals("GET") && v.cookies.containsKey("XSRF-TOKEN"))
            peticion.header("X-XSRF-TOKEN", v.cookies.get("XSRF-TOKEN"));
        if (idempotencia != null) peticion.header("Idempotency-Key", idempotencia);
        var respuesta = cliente.send(peticion.build(), HttpResponse.BodyHandlers.ofString());
        assertThat(respuesta.statusCode())
                .as("%s %s", metodo, ruta)
                .isIn(java.util.Arrays.stream(esperados).boxed().toList());
        for (String cookie : respuesta.headers().allValues("Set-Cookie")) {
            var par = cookie.split(";", 2)[0].split("=", 2);
            if (par.length == 2) v.cookies.put(par[0], par[1]);
        }
        assertThat(respuesta.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
        return respuesta;
    }
}
