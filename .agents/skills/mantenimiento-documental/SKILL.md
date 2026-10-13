---
name: mantenimiento-documental
description: "Actualizar documentación afectada por una decisión o cambio autorizado y comprobar su coherencia. Usar al mantener fuentes principales, índices, enlaces y memoria sin inventar estados."
---

# Mantener documentación coherente

**Estado:** Aprobada

## Entradas

- Decisión o cambio autorizado y su origen.
- Documentos principales afectados.
- Alcance de archivos que pueden modificarse.
- Estado y evidencia disponibles.

## Fuentes

Lee [AGENTS](../../../AGENTS.md) y [MEMORY](../../../MEMORY.md).
Aplica la [política documental](../../../docs/politicas/documentacion.md).
Consulta el [índice](../../../docs/README.md)
y la [gestión de contexto](../../../docs/metodologia/contexto.md).

## Procedimiento

1. Identifica dónde se define la información completa.
2. Lee esa fuente y las referencias que dependen de ella.
3. Actualiza primero el documento principal autorizado.
4. Revisa resúmenes, estados y enlaces afectados.
5. Distingue previsto, aprobado, implementado, ejecutado y comprobado.
6. Comprueba formato, enlaces y ausencia de información sensible.
7. Actualiza MEMORY si cambió un estado relevante y está autorizado.
8. Entrega cambios, verificaciones y pendientes.

No copies políticas completas en varios documentos.
No crees archivos vacíos para reservar fases futuras.
Los archivos futuros se describen como previstos y no se enlazan.
Las rutas retiradas se identifican como referencias históricas.
Respeta las instrucciones expresas que prohíban cambiar la memoria.

## Comprobaciones

Verifica que los destinos internos existen.
Revisa títulos, terminología y estados coherentes.
Comprueba que los comandos publicados tienen evidencia o se presentan como previstos.
Busca espacios finales y marcadores de contenido sin redactar.
Revisa que ninguna prueba pendiente figure como superada.
No declares una búsqueda automática como garantía absoluta de ausencia de secretos.

## Salida

Entrega archivos creados y modificados.
Explica qué decisión respalda los cambios de estado.
Indica enlaces comprobados y carencias encontradas.
Conserva la memoria breve y las decisiones en fuentes duraderas.
Propón el siguiente paso de revisión humana.

## Parada

Detente ante decisiones contradictorias o autorizaciones insuficientes.
No apruebes documentos por iniciativa propia.
No ejecutes Git ni modifiques archivos ajenos al encargo.
No alteres requisitos para hacer coincidir el texto con una implementación.
