# Prompts operativos

**Estado:** Aprobado

## Para qué se conservan

Un prompt operativo es un encargo reutilizable para una sesión concreta.
Conservarlo permite revisar objetivo, alcance, límites y entregables.
No sustituye la especificación, el plan ni las tareas aprobadas.

## Nombre y estado

El nombre identifica propósito y secuencia.
Por ejemplo, [sesion-nocturna-01.md](sesion-nocturna-01.md).
Una revisión mantiene el propósito o crea otro prompt si cambia el encargo.

Cada prompt indica su estado y las aprobaciones que necesita.
Un borrador lleva `Pendiente de aprobación humana`.
Solo se marca aprobado cuando existe una decisión humana explícita.
Su aprobación no autoriza otras tareas ni inicia automáticamente una ejecución.

## Contenido necesario

Incluye objetivo, documentos de entrada y alcance de escritura.
Define entregables, criterios de aceptación y comprobaciones.
Indica límites de permisos, Git, secretos y ampliación de requisitos.
Añade condiciones de parada y tiempo máximo cuando corresponda.

Usa la [plantilla de relevo](../plantillas/relevo.md) para delegaciones.
La [orquestación](../orquestacion.md) define las funciones de cada agente.
No dupliques las políticas completas dentro del prompt.

## Protección de la información

No guardes secretos, credenciales, tokens ni datos privados.
Los ejemplos usarán datos ficticios.
Revisa también las rutas y salidas que se incluyan.
La [política de seguridad](../../seguridad.md) sigue siendo aplicable.

## Relación con ejecuciones

El prompt expresa lo solicitado, no los resultados obtenidos.
No copies dentro los logs ni el informe final de la ejecución.
Registra cada sesión real en el
[CSV de ejecuciones](../../trazabilidad/ejecuciones-agentes.csv).
Relaciona esa fila con el prompt utilizado y con la evidencia correspondiente.

En un incremento, la validación recoge sus comprobaciones reales.
Si todavía no se ejecutó, la ausencia de evidencia debe quedar clara.
El registro de una sesión no sustituye las pruebas de la aplicación.

## Estado actual

El prompt de la sesión nocturna 01 está aprobado para lanzamiento humano tras
superar las comprobaciones bloqueantes del preflight, con fallback agéntico.
Su límite máximo aprobado es de diez horas; aprobarlo no programa ni inicia la sesión.
La persona responsable decidirá cuándo lanzarlo después del cierre Git humano.
