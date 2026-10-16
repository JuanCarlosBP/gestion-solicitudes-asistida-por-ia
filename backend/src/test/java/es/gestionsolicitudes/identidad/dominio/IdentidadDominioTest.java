package es.gestionsolicitudes.identidad.dominio;

import static org.assertj.core.api.Assertions.*;

import es.gestionsolicitudes.identidad.aplicacion.Contrasenas;
import es.gestionsolicitudes.identidad.aplicacion.SecretosRefresco;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;
import org.junit.jupiter.api.Test;

class IdentidadDominioTest {
    private static final Contrasenas CLAVES = new Contrasenas();
    private static final Instant AHORA = Instant.parse("2026-10-14T00:00:00Z");

    @Test
    void normalizaCorreoConLocaleRootYRechazaEntradasInvalidas() {
        Locale anterior = Locale.getDefault();
        try {
            Locale.setDefault(Locale.forLanguageTag("tr-TR"));
            assertThat(Correo.normalizar("  INVITADO@Ejemplo.Invalid  "))
                    .isEqualTo("invitado@ejemplo.invalid");
        } finally {
            Locale.setDefault(anterior);
        }
        for (String valor :
                new String[] {
                    null,
                    "",
                    "sin-arroba",
                    "a b@ejemplo.invalid",
                    "a".repeat(255) + "@ejemplo.invalid"
                }) {
            assertThatThrownBy(() -> Correo.normalizar(valor))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void aceptaLimitesUnicodeEspaciosYSinComposicionArbitraria() {
        for (String clave :
                new String[] {
                    "a".repeat(15),
                    "a".repeat(128),
                    "🔐".repeat(15),
                    "🔐".repeat(128),
                    "  frase de prueba con espacios  "
                }) {
            assertThatCode(() -> CLAVES.validar(clave)).doesNotThrowAnyException();
        }
        for (String clave :
                new String[] {
                    null,
                    "a".repeat(14),
                    "a".repeat(129),
                    "🔐".repeat(129),
                    "passwordpassword",
                    "123456789012345",
                    "qwertyuiopasdfgh",
                    "administrador123"
                }) {
            assertThatThrownBy(() -> CLAVES.validar(clave))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void argon2idTieneCosteAprobadoSalAleatoriaYNoRecortaClaves() {
        String clave = "  frase ficticia Unicode á 🔐  ";
        long inicio = System.nanoTime();
        String primero = CLAVES.codificar(clave);
        long milisegundos = Duration.ofNanos(System.nanoTime() - inicio).toMillis();
        String segundo = CLAVES.codificar(clave);
        assertThat(primero.startsWith("$argon2id$v=19$m=19456,t=2,p=1$")).isTrue();
        assertThat(primero.equals(segundo)).isFalse();
        assertThat(CLAVES.verificar(clave, primero)).isTrue();
        assertThat(CLAVES.verificar(clave.strip(), primero)).isFalse();
        assertThat(CLAVES.verificar("clave incorrecta ficticia", primero)).isFalse();
        assertThat(CLAVES.verificar(null, primero)).isFalse();
        assertThat(CLAVES.verificar("a".repeat(1000), primero)).isFalse();
        System.out.println(
                "ARGON2ID_MEDICION hashMs="
                        + milisegundos
                        + " memoriaKiB=19456 iteraciones=2 paralelismo=1; muestra local, no garantía temporal");
    }

    @Test
    void quintoFalloBloqueaQuinceMinutosYLosBloqueadosNoAmplianVentana() {
        IntentosAcceso estado = IntentosAcceso.vacios();
        for (int numero = 0; numero < 4; numero++) {
            estado = estado.fallo(AHORA.plusSeconds(numero));
            assertThat(estado.bloqueado(AHORA.plusSeconds(numero))).isFalse();
        }
        estado = estado.fallo(AHORA.plusSeconds(4));
        assertThat(estado.fallos()).isEqualTo(5);
        assertThat(estado.bloqueadoHasta()).isEqualTo(AHORA.plusSeconds(904));
        assertThat(estado.fallo(AHORA.plusSeconds(600))).isEqualTo(estado);
        assertThat(estado.bloqueado(AHORA.plusSeconds(904))).isFalse();
        assertThat(estado.fallo(AHORA.plusSeconds(904)).fallos()).isEqualTo(1);
    }

    @Test
    void ventanaDeFallosCaducaExactamenteYElExitoPuedeRestablecerla() {
        var primero = IntentosAcceso.vacios().fallo(AHORA);
        assertThat(primero.fallo(AHORA.plusSeconds(899)).fallos()).isEqualTo(2);
        var siguiente = primero.fallo(AHORA.plusSeconds(900));
        assertThat(siguiente.fallos()).isEqualTo(1);
        assertThat(siguiente.inicioVentana()).isEqualTo(AHORA.plusSeconds(900));
        assertThat(IntentosAcceso.vacios().fallos()).isZero();
        assertThat(IntentosAcceso.vacios().bloqueadoHasta()).isNull();
    }

    @Test
    void secretosOpacosAleatoriosSeComparanSinConservarElValor() {
        var generador = new SecretosRefresco();
        var primero = generador.nueva();
        var segundo = generador.nueva();
        assertThat(primero.secreto().length()).isEqualTo(43);
        assertThat(primero.secreto().equals(segundo.secreto())).isFalse();
        assertThat(primero.hash().length).isEqualTo(32);
        assertThat(primero.coincide(primero.hash())).isTrue();
        assertThat(primero.coincide(segundo.hash())).isFalse();
        assertThat(
                        generador
                                .interpretar(primero.valorCookie())
                                .orElseThrow()
                                .coincide(primero.hash()))
                .isTrue();
        for (String invalido :
                new String[] {
                    null, "", "invalido", primero.id() + ".corto", primero.valorCookie() + "extra"
                }) {
            assertThat(generador.interpretar(invalido).isEmpty()).isTrue();
        }
        assertThat(primero.toString()).isEqualTo("Credencial[omitida]");
    }

    @Test
    void lasColeccionesYHashInternosNoSeExponenParaModificacion() {
        var roles = new java.util.HashSet<>(Set.of(Rol.SOLICITANTE));
        var usuario =
                new UsuarioPublico(
                        java.util.UUID.randomUUID(), "demo@ejemplo.invalid", "Demo", roles);
        roles.clear();
        assertThat(usuario.roles()).containsExactly(Rol.SOLICITANTE);
        assertThatThrownBy(() -> usuario.roles().clear())
                .isInstanceOf(UnsupportedOperationException.class);
        byte[] hash = new byte[32];
        var token =
                new TokenRefresco(
                        java.util.UUID.randomUUID(),
                        java.util.UUID.randomUUID(),
                        java.util.UUID.randomUUID(),
                        hash,
                        "ACTIVO",
                        AHORA,
                        AHORA.plusSeconds(10));
        hash[0] = 1;
        token.secretoHash()[1] = 2;
        assertThat(token.secretoHash()[0]).isZero();
        assertThat(token.secretoHash()[1]).isZero();
    }
}
