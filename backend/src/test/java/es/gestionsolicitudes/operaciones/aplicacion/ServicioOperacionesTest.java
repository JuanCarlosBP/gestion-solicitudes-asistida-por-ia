package es.gestionsolicitudes.operaciones.aplicacion;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import es.gestionsolicitudes.operaciones.dominio.*;
import es.gestionsolicitudes.proveedores.dominio.*;
import java.time.*;
import java.util.*;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.*;
import tools.jackson.databind.json.JsonMapper;

class ServicioOperacionesTest {
    private final RepositorioOperaciones repositorio = mock(RepositorioOperaciones.class);
    private final AutorizacionOperaciones autorizacion = mock(AutorizacionOperaciones.class);
    private final UUID usuario = UUID.randomUUID(),
            clave = UUID.randomUUID(),
            recurso = UUID.randomUUID();
    private final Instant ahora = Instant.parse("2026-10-15T10:00:00Z");
    private final PeticionOperacion peticion =
            PeticionOperacion.de(
                    TipoOperacion.CREAR_PROVEEDOR,
                    usuario,
                    clave,
                    null,
                    null,
                    "PROFESIONAL",
                    "Nombre",
                    "ES",
                    "ABC",
                    null,
                    null);
    private final Proveedor proveedor =
            new Proveedor(
                    recurso,
                    new DatosProveedor(
                            TipoProveedor.PROFESIONAL, "Nombre", "ES", "ABC", null, null),
                    true,
                    0,
                    ahora,
                    ahora);
    private final ServicioOperaciones servicio =
            new ServicioOperaciones(
                    repositorio,
                    autorizacion,
                    new TransaccionesPrueba(),
                    Clock.fixed(ahora, ZoneOffset.UTC));

    @Test
    void permisoActualPrecedeLecturaReplayYRevalidaRecursoPersistido() {
        when(repositorio.intentarBloqueo(usuario, clave)).thenReturn(true);
        when(repositorio.buscar(usuario, clave))
                .thenReturn(Optional.of(confirmada(peticion.huella())));
        Supplier<Proveedor> efecto =
                () -> {
                    throw new AssertionError("Un replay no ejecuta efectos");
                };
        assertThat(servicio.ejecutar(peticion, Proveedor.class, efecto)).isEqualTo(proveedor);
        var orden = inOrder(repositorio, autorizacion);
        orden.verify(repositorio).intentarBloqueo(usuario, clave);
        orden.verify(autorizacion).exigir(usuario, TipoOperacion.CREAR_PROVEEDOR, null, true);
        orden.verify(repositorio).buscar(usuario, clave);
        orden.verify(autorizacion).exigir(usuario, TipoOperacion.CREAR_PROVEEDOR, recurso, true);
        verify(repositorio, never()).guardar(any(), any(), any());
    }

    @Test
    void permisoRevocadoImpideLeerResultadoYNoEjecutaCallback() {
        when(repositorio.intentarBloqueo(usuario, clave)).thenReturn(true);
        doThrow(new ErrorOperacion(ErrorOperacion.Codigo.ACCESO_NO_PERMITIDO))
                .when(autorizacion)
                .exigir(usuario, TipoOperacion.CREAR_PROVEEDOR, null, true);
        assertThatThrownBy(
                        () ->
                                servicio.ejecutar(
                                        peticion,
                                        Proveedor.class,
                                        () -> {
                                            throw new AssertionError("Sin permiso");
                                        }))
                .hasMessage("ACCESO_NO_PERMITIDO");
        verify(repositorio, never()).buscar(any(), any());
        verify(repositorio, never()).guardar(any(), any(), any());
    }

    @Test
    void incompatibleNoEjecutaEfectoNiPersisteError() {
        when(repositorio.intentarBloqueo(usuario, clave)).thenReturn(true);
        when(repositorio.buscar(usuario, clave))
                .thenReturn(Optional.of(confirmada("0".repeat(64))));
        assertThatThrownBy(
                        () ->
                                servicio.ejecutar(
                                        peticion,
                                        Proveedor.class,
                                        () -> {
                                            throw new AssertionError("Incompatible");
                                        }))
                .hasMessage("CLAVE_IDEMPOTENCIA_REUTILIZADA");
        verify(repositorio, never()).guardar(any(), any(), any());
    }

    @Test
    void falloAntesCommitRetiraProgresoYDejaReintentarLaMismaClave() {
        when(repositorio.intentarBloqueo(usuario, clave)).thenReturn(true);
        when(repositorio.buscar(usuario, clave)).thenReturn(Optional.empty());
        assertThatThrownBy(
                        () ->
                                servicio.ejecutar(
                                        peticion,
                                        Proveedor.class,
                                        () -> {
                                            throw new IllegalStateException("fallo ficticio");
                                        }))
                .hasMessage("fallo ficticio");
        assertThatThrownBy(() -> servicio.consultar(usuario, clave))
                .hasMessage("OPERACION_NO_ENCONTRADA");
        assertThat(servicio.ejecutar(peticion, Proveedor.class, () -> proveedor))
                .isEqualTo(proveedor);
        verify(repositorio).guardar(peticion, proveedor, ahora);
        assertThat(servicio.esperasEnCurso()).isZero();
    }

    @Test
    void recuperacionUsaProyeccionMinimaYRevalidaAntesDeDevolver() {
        when(repositorio.buscar(usuario, clave))
                .thenReturn(Optional.of(confirmada(peticion.huella())));
        var resultado = servicio.consultar(usuario, clave);
        verify(autorizacion).exigirConsulta(usuario, TipoOperacion.CREAR_PROVEEDOR, recurso);
        var json = JsonMapper.builder().build().valueToTree(resultado);
        assertThat(json.path("resultado").propertyNames())
                .containsExactlyInAnyOrder("estadoHttp", "id", "version", "estado");
        assertThat(json.toString()).doesNotContain("Nombre", "ABC", "huella", "datos");
    }

    @Test
    void segundaLecturaCierraVentanaCommitEntreLecturaYRetiradaMapa() {
        when(repositorio.buscar(usuario, clave))
                .thenReturn(Optional.empty(), Optional.of(confirmada(peticion.huella())));
        assertThat(servicio.consultar(usuario, clave).estado()).isEqualTo("COMPLETADA");
        verify(repositorio, times(2)).buscar(usuario, clave);
        verify(autorizacion).exigirConsulta(usuario, TipoOperacion.CREAR_PROVEEDOR, recurso);
    }

    private RepositorioOperaciones.Confirmada confirmada(String huella) {
        return new RepositorioOperaciones.Confirmada(
                TipoOperacion.CREAR_PROVEEDOR,
                recurso,
                huella,
                2,
                new EstadoOperacion.Resultado(201, recurso, 0, "ACTIVO", null),
                proveedor);
    }

    private static final class TransaccionesPrueba extends AbstractPlatformTransactionManager {
        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected void doBegin(Object tx, TransactionDefinition definicion) {}

        @Override
        protected void doCommit(DefaultTransactionStatus estado) {}

        @Override
        protected void doRollback(DefaultTransactionStatus estado) {}
    }
}
