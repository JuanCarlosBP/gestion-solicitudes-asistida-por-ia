package es.gestionsolicitudes.historial.http;

import static org.assertj.core.api.Assertions.*;

import es.gestionsolicitudes.historial.dominio.*;
import es.gestionsolicitudes.solicitudes.dominio.ErrorSolicitud;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.util.LinkedMultiValueMap;

class FiltrosHistorialTest {
    @Test
    void paginaPredeterminadaAcotadaYRecursoForzado() {
        var c = FiltrosHistorial.leer(new LinkedMultiValueMap<>(), true);
        assertThat(c.pagina()).isZero();
        assertThat(c.tamano()).isEqualTo(20);
        UUID recurso = UUID.randomUUID();
        assertThat(c.recurso(TipoRecurso.SOLICITUD, recurso).recursoId()).isEqualTo(recurso);
        assertThat(c.recursoId()).isNull();
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "page=-1",
                "page=2147483647",
                "page=1.5",
                "page=",
                "size=0",
                "size=101",
                "size=",
                "actor=1-1-1-1-1",
                "actor=",
                "accion=APROBAR",
                "accion=",
                "tipoRecurso=USUARIO",
                "recursoId=x",
                "desde=2026-02-30T00:00:00Z",
                "desde=2026-10-15",
                "desde=2026-10-15T20:00:00",
                "desde=",
                "hasta=+999999999-12-31T23:59:59Z",
                "sort=ocurridoEn,desc",
                "desconocido=x"
            })
    void entradasInvalidasSonErrorControlado(String valor) {
        String[] partes = valor.split("=", 2);
        var p = new LinkedMultiValueMap<String, String>();
        p.add(partes[0], partes[1]);
        assertThatThrownBy(() -> FiltrosHistorial.leer(p, true))
                .isInstanceOf(ErrorSolicitud.class)
                .hasMessage("SOLICITUD_INVALIDA");
    }

    @Test
    void todosLosFiltrosCanonicosConOffsetYNanosegundos() {
        UUID actor = UUID.randomUUID(), recurso = UUID.randomUUID();
        var p = new LinkedMultiValueMap<String, String>();
        p.set("page", "1000");
        p.set("size", "100");
        p.set("accion", "APROBADA");
        p.set("actor", actor.toString());
        p.set("tipoRecurso", "SOLICITUD");
        p.set("recursoId", recurso.toString());
        p.set("desde", "2026-10-15T20:15:00.123456789+02:00");
        p.set("hasta", "2026-10-15T18:15:00.123456789Z");
        var c = FiltrosHistorial.leer(p, true);
        assertThat(c.desde()).isEqualTo(Instant.parse("2026-10-15T18:15:00.123456789Z"));
        assertThat(c.hasta()).isEqualTo(c.desde());
        assertThat(c.actor()).isEqualTo(actor);
        assertThat(c.accion()).isEqualTo(AccionHistorial.APROBADA);
        p.set("page", "1001");
        assertThatThrownBy(() -> FiltrosHistorial.leer(p, true)).hasMessage("SOLICITUD_INVALIDA");
    }

    @Test
    void noAdmiteDuplicadosFiltrosDeRecursoNiPeriodoInvertido() {
        var p = new LinkedMultiValueMap<String, String>();
        p.add("page", "0");
        p.add("page", "1");
        assertThatThrownBy(() -> FiltrosHistorial.leer(p, true)).hasMessage("SOLICITUD_INVALIDA");
        p.clear();
        p.set("tipoRecurso", "PROVEEDOR");
        assertThatThrownBy(() -> FiltrosHistorial.leer(p, false)).hasMessage("SOLICITUD_INVALIDA");
        p.clear();
        p.set("desde", "2026-10-16T00:00:00Z");
        p.set("hasta", "2026-10-15T00:00:00Z");
        assertThatThrownBy(() -> FiltrosHistorial.leer(p, true)).hasMessage("SOLICITUD_INVALIDA");
    }
}
