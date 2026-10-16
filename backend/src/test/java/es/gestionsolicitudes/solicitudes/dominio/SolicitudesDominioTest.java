package es.gestionsolicitudes.solicitudes.dominio;

import static org.assertj.core.api.Assertions.*;

import es.gestionsolicitudes.identidad.dominio.Rol;
import es.gestionsolicitudes.solicitudes.http.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.util.LinkedMultiValueMap;
import tools.jackson.databind.json.JsonMapper;

class SolicitudesDominioTest {
    private final JsonMapper json = JsonMapper.builder().build();

    private Concepto linea(String cantidad, String precio, int posicion) {
        return new Concepto(
                UUID.randomUUID(),
                "Línea",
                new BigDecimal(cantidad),
                Concepto.Unidad.UNIDAD,
                new BigDecimal(precio),
                null,
                posicion);
    }

    @Test
    void ejemplosObligatoriosYTotalDeLineasRedondeadas() {
        var lineas =
                List.of(
                        linea("1", "10.0000", 1),
                        linea("2.500", "4.1250", 2),
                        linea("3", "0.3350", 3));
        assertThat(lineas)
                .extracting(c -> c.importeLinea().toPlainString())
                .containsExactly("10.00", "10.31", "1.01");
        assertThat(new DatosBorrador("Asunto", null, null, null, lineas, Set.of()).total())
                .isEqualByComparingTo("21.32");
    }

    @Test
    void redondeoHalfUpPorLineaNoGlobal() {
        var datos =
                new DatosBorrador(
                        "Asunto",
                        null,
                        null,
                        null,
                        List.of(linea("1", "0.0050", 1), linea("1", "0.0050", 2)),
                        Set.of());
        assertThat(datos.total()).isEqualByComparingTo("0.02");
    }

    @Test
    void lineaPositivaPuedeRedondearCero() {
        assertThat(linea("0.001", "0.0001", 1).importeLinea()).isEqualByComparingTo("0.00");
    }

    @Test
    void escalasNormalizadasDeRespuesta() {
        var c = linea("1", "2", 1);
        assertThat(c.cantidad().toPlainString()).isEqualTo("1.000");
        assertThat(c.precioUnitario().toPlainString()).isEqualTo("2.0000");
    }

    @Test
    void limitesDecimalesAceptadosSinDesbordamiento() {
        assertThat(linea("999999999999.999", "0.0001", 1).importeLinea())
                .isEqualByComparingTo("100000000.00");
        assertThat(linea("0.001", "99999999999.9999", 1).importeLinea())
                .isEqualByComparingTo("100000000.00");
    }

    @Test
    void rechazaCeroNegativosEscalaPrecisionYProductoExcesivo() {
        for (String valor : List.of("0", "-1", "1.0000", "1000000000000", "9999999999999.999"))
            assertThatThrownBy(() -> linea(valor, "1", 1)).isInstanceOf(ErrorSolicitud.class);
        for (String valor : List.of("0", "-1", "1.00000", "100000000000"))
            assertThatThrownBy(() -> linea("1", valor, 1)).isInstanceOf(ErrorSolicitud.class);
        assertThatThrownBy(() -> linea("999999999999.999", "99999999999.9999", 1))
                .isInstanceOf(ErrorSolicitud.class);
    }

    @Test
    void rechazaTotalExcesivoAunqueLineasSeanValidas() {
        var conceptos = List.of(linea("100", "99999999999.9999", 1), linea("1", "1", 2));
        assertThatThrownBy(() -> new DatosBorrador("Asunto", null, null, null, conceptos, Set.of()))
                .isInstanceOf(ErrorSolicitud.class);
    }

    @Test
    void UnicodePuntosCodigoYRecorteExterior() {
        assertThat(DatosBorrador.texto("\u00a0\u0085abc\u00a0", 3, 3)).isEqualTo("abc");
        for (String invalido : List.of("abc\ud800", "abc\udc00"))
            assertThatThrownBy(() -> DatosBorrador.texto(invalido, 3, 160))
                    .isInstanceOf(ErrorSolicitud.class);
        assertThat(DatosBorrador.texto("  😀😀😀  ", 3, 3)).isEqualTo("😀😀😀");
        assertThat(
                        new DatosBorrador(
                                        "😀".repeat(160),
                                        "😀".repeat(2000),
                                        null,
                                        null,
                                        List.of(),
                                        Set.of())
                                .asunto())
                .hasSize(320);
        assertThatThrownBy(() -> DatosBorrador.texto("😀".repeat(161), 3, 160))
                .isInstanceOf(ErrorSolicitud.class);
        assertThatThrownBy(() -> DatosBorrador.texto("ab\0c", 3, 160))
                .isInstanceOf(ErrorSolicitud.class);
    }

    @Test
    void coleccionLimitadaPosicionesUnicasIdsUnicosYNoContiguas() {
        var a = linea("1", "1", 1);
        var b = linea("1", "1", 9);
        assertThat(
                        new DatosBorrador("Asunto", null, null, null, List.of(a, b), Set.of())
                                .conceptos())
                .hasSize(2);
        assertThatThrownBy(
                        () ->
                                new DatosBorrador(
                                        "Asunto", null, null, null, List.of(a, a), Set.of()))
                .isInstanceOf(ErrorSolicitud.class);
        assertThatThrownBy(
                        () ->
                                new DatosBorrador(
                                        "Asunto",
                                        null,
                                        null,
                                        null,
                                        List.of(a, linea("1", "1", 1)),
                                        Set.of()))
                .isInstanceOf(ErrorSolicitud.class);
        assertThatThrownBy(() -> linea("1", "1", 0)).isInstanceOf(ErrorSolicitud.class);
        var cien = new ArrayList<Concepto>();
        for (int i = 1; i <= 100; i++) cien.add(linea("1", "1", i));
        assertThat(new DatosBorrador("Asunto", null, null, null, cien, Set.of()).conceptos())
                .hasSize(100);
        cien.add(linea("1", "1", 101));
        assertThatThrownBy(() -> new DatosBorrador("Asunto", null, null, null, cien, Set.of()))
                .isInstanceOf(ErrorSolicitud.class);
    }

    @Test
    void defensasDeColecciones() {
        var lista = new ArrayList<>(List.of(linea("1", "1", 1)));
        var datos = new DatosBorrador("Asunto", null, null, null, lista, Set.of());
        lista.clear();
        assertThat(datos.conceptos()).hasSize(1);
        assertThatThrownBy(() -> datos.conceptos().clear())
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void permisosUnionYPropiedadEstado() {
        UUID autor = UUID.randomUUID(), supervisor = UUID.randomUUID();
        var borrador = solicitud(autor, supervisor, "BORRADOR");
        var presentada = solicitud(autor, supervisor, "PRESENTADA");
        assertThat(new ActorSolicitud(autor, Set.of(Rol.SOLICITANTE)).visible(borrador)).isTrue();
        assertThat(new ActorSolicitud(supervisor, Set.of(Rol.SUPERVISOR)).visible(borrador))
                .isFalse();
        assertThat(new ActorSolicitud(supervisor, Set.of(Rol.SUPERVISOR)).visible(presentada))
                .isTrue();
        assertThat(
                        new ActorSolicitud(supervisor, Set.of(Rol.SUPERVISOR, Rol.AUDITOR))
                                .visible(borrador))
                .isTrue();
        assertThatThrownBy(
                        () ->
                                new ActorSolicitud(autor, Set.of(Rol.ADMINISTRADOR))
                                        .exigirPropiedad(borrador))
                .isInstanceOf(ErrorSolicitud.class);
        assertThatCode(
                        () ->
                                new ActorSolicitud(
                                                autor, Set.of(Rol.SOLICITANTE, Rol.ADMINISTRADOR))
                                        .exigirPropiedad(borrador))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> presentada.exigirEditable(0)).hasMessage("SOLICITUD_NO_EDITABLE");
        assertThatThrownBy(() -> borrador.exigirEditable(1)).hasMessage("VERSION_OBSOLETA");
    }

    @Test
    void postEstrictoNoAsignaCamposDelServidor() {
        assertThat(EntradaSolicitud.asunto(json.readTree("{\"asunto\":\"  Asunto válido  \"}")))
                .isEqualTo("Asunto válido");
        for (String entrada :
                List.of(
                        "null",
                        "[]",
                        "{}",
                        "{\"asunto\":3}",
                        "{\"asunto\":\"abc\",\"autor\":\"falso\"}"))
            assertThatThrownBy(() -> EntradaSolicitud.asunto(json.readTree(entrada)))
                    .isInstanceOf(ErrorSolicitud.class);
    }

    @Test
    void versionesYUuidEstrictos() {
        for (String version : List.of("null", "-1", "1.0", "\"1\"", "9223372036854775808"))
            assertThatThrownBy(
                            () ->
                                    EntradaSolicitud.version(
                                            json.readTree("{\"version\":" + version + "}"), true))
                    .isInstanceOf(ErrorSolicitud.class);
        for (String id : List.of("1-1-1-1-1", "no-uuid", ""))
            assertThatThrownBy(() -> EntradaSolicitud.uuid(id)).isInstanceOf(ErrorSolicitud.class);
    }

    @Test
    void filtrosCerradosSinDuplicados() {
        var filtros = new LinkedMultiValueMap<String, String>();
        filtros.add("page", "1");
        filtros.add("size", "10");
        assertThat(FiltrosSolicitudes.leer(filtros).pagina()).isEqualTo(1);
        filtros.add("page", "2");
        assertThatThrownBy(() -> FiltrosSolicitudes.leer(filtros))
                .isInstanceOf(ErrorSolicitud.class);
        filtros.clear();
        filtros.add("desconocido", "1");
        assertThatThrownBy(() -> FiltrosSolicitudes.leer(filtros))
                .isInstanceOf(ErrorSolicitud.class);
    }

    @Test
    void filtrosRechazanRangosOrdenFechasEInyeccion() {
        Map<String, String> invalidos =
                Map.of(
                        "page",
                        "-1",
                        "size",
                        "101",
                        "sort",
                        "total;DROP TABLE,asc",
                        "fechaDesde",
                        "2026-02-30",
                        "numero",
                        "SOL-1",
                        "autor",
                        "1-1-1-1-1",
                        "estado",
                        "ANULADA");
        invalidos.forEach(
                (k, v) -> {
                    var f = new LinkedMultiValueMap<String, String>();
                    f.add(k, v);
                    assertThatThrownBy(() -> FiltrosSolicitudes.leer(f))
                            .isInstanceOf(ErrorSolicitud.class);
                });
        var f = new LinkedMultiValueMap<String, String>();
        f.add("fechaDesde", "2026-10-15");
        f.add("fechaHasta", "2026-10-14");
        assertThatThrownBy(() -> FiltrosSolicitudes.leer(f)).isInstanceOf(ErrorSolicitud.class);
        assertThatThrownBy(() -> ConsultaSolicitudes.paginacion(100001, 1))
                .isInstanceOf(ErrorSolicitud.class);
    }

    private static Solicitud solicitud(UUID autor, UUID supervisor, String estado) {
        return new Solicitud(
                UUID.randomUUID(),
                "SOL-2026-000001",
                new Solicitud.Persona(autor, "Autor"),
                "Asunto",
                null,
                null,
                null,
                supervisor,
                new Solicitud.Persona(supervisor, "Supervisor"),
                "EUR",
                estado,
                new BigDecimal("0.00"),
                0,
                Instant.EPOCH,
                Instant.EPOCH,
                null,
                List.of(),
                null);
    }
}
