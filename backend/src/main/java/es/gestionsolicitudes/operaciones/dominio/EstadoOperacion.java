package es.gestionsolicitudes.operaciones.dominio;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record EstadoOperacion(
        String estado, TipoOperacion operacion, UUID recursoId, Resultado resultado) {
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Resultado(int estadoHttp, UUID id, long version, String estado, String numero) {}
}
