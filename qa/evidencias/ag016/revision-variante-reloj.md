# Revisión independiente de la variante de caducidad

Revisor `revision_reanudacion`, solo lectura; conclusiones transcritas por el
coordinador el2026-10-16 antes de iniciar las cuatro nuevas ventanas. No constituye
aceptación humana ni resultado de dimensionamiento.

La pasada `carga-final-a1` conserva FAIL, sus muestras, evaluación y contrato.
La variante separa dos coberturas: admisión temporal exacta con PostgreSQL real y
Clock fijo solo en el test, y ciclo natural persistido durante la carga. La segunda
observa la generación original, TTL60min y CADUCADA no anterior al vencimiento,
antes de emitir una única GET401. Un fallo o agotamiento de120s/65min falla el
ensayo; no se reintenta la GET ni se prolonga la ventana. La observación privada
no añade peticiones HTTP ficticias ni recorridos útiles.

La revisión encontró un defecto medio de precisión: el cast textual de PostgreSQL
redondea empates al par, mientras JDBC42.7.13 aplica half-up. Se comprobó mediante
[SELECT real](precision-pg-01/resultado.json) y [bytecode del JAR](precision-pg-01/jdbc.json).
El helper ahora normaliza solo el literal SQL a seis decimales como JDBC,
incluidos acarreos; conserva el Instant original público. El hallazgo está cerrado.

Evidencia contrastada por el revisor:

- [83 pruebas offline PASS](variante-reloj-offline-02/ejecucion.json):34barrera,
  16observador y33evaluador. Ninguna omitida; son fixtures, no capacidad.
- [IT frontera02](backend-caducidad-frontera-02/ejecucion.json):3casos PASS,
  −1/0/+1µs con fila RESERVADO, sin reconciliador; JAR final02 conservado.
- [Observador real02](observador-real-02/resultado.json): dos Instant originales
  con nueve decimales, empates y acarreo anual. Reservas ya liberadas producen
  ESPERANDO; no se presenta como espera natural de60min.
- [Arnés HTTP04](arnes-http-04/resultado-carga.json): semilla completa, tres
  recorridos y sobrecupo PASS; prueba separada del benchmark.
- [Perfil A1](perfil-reloj-a1/perfil.json): arranque17,452s e imágenes esperadas.

No quedan bloqueos identificados en el delta revisado. Se comprobaron identidad
Docker, lecturas sin mutación, plazos monotónicos, rechazo de evidencia incoherente,
huellas y nuevas QA inventariadas. Las cuatro ventanas y la recomendación siguen
pendientes al emitir esta revisión.
