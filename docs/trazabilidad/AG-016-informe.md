# AG-016 — Demo independiente, operación local y dimensionamiento

**Estado: EN CURSO. Implementación, aislamiento y regresión local comprobados; dimensionamiento pendiente. Sin aceptación humana ni publicación.**

## Autorización, base y trazabilidad

El encargo humano AG-016 del 2026-10-16 autoriza concretar SDD, revisar de forma independiente, implementar y probar en localhost. Git y operación pública corresponden al humano. Comunica 001–007 y AG-015 aceptados e integrados, main `eaa0baec78ed9b99d8039ea7e6256b254be295d3`, árbol `5e5d0a92ed719e74729461ab3f8d63baaa84bcb2` y CI `38882642418` backend/frontend/compose PASS. La CI remota no se ha consultado: la fuente es el encargo. La lectura de HEAD y referencia coincide con la rama y commit indicados.

Primera marca explícita observada: `2026-10-16T12:41:00.2018841+02:00`; hubo lecturas iniciales anteriores sin marca exacta. Las evidencias nuevas están en [qa/evidencias/ag016](../../qa/evidencias/ag016). Los informes, sellos, migraciones V1–V7 y resultados históricos se conservan.

El protocolo externo v1.0 se recibió después del texto inicial. Su [referencia y huella](../../qa/evidencias/ag016/protocolo-referencia.json) identifican la fuente; sus perfiles y umbrales se incorporaron como objetivos de ensayo.

## Diseño y coordinación

Una instancia Java HTTP, Angular estático/nginx y un PostgreSQL con control operativo y tres bases ficticias exclusivas. Un supervisor Java auxiliar, sin HTTP y con identidad separada, recicla solo espacios elegibles; su consumo forma parte del presupuesto. Reserva, generación y cookie válida se resuelven antes de acceder al negocio. El backend no recibe credenciales administrativas ni migradoras.

El coordinador es el único propietario de Docker y de los documentos globales. Backend y frontend trabajan en rutas disjuntas; máximo tres agentes activos. El revisor independiente no modifica archivos ni opera servicios. Se aplicaron las skills SDD, QA, seguridad y mantenimiento documental. La [revisión previa](../../qa/evidencias/ag016/revision-diseno.md) aclaró Bearer en bootstrap, invalidación de sesiones restauradas y cuota compatible con operaciones de seguridad antes de implementar. No constituye aceptación humana.

## Comprobaciones observadas

| Ejecución | Resultado | Alcance y límite |
|---|---|---|
| Backend inicial | PASS | 135 unitarias, formato y SpotBugs sin hallazgos. |
| Supervisor real01 | PASS, 9 controles | Reciclaje automático3927ms, sesión anterior rechazada, apagado897ms con exit143 y sin conexión migradora residual. |
| Frontend final04 | PASS | 528 casos en28 archivos;46 dirigidos de demo, tipos, lint, formato y build correctos. |
| aislamiento-http-03 | PASS, 49 controles | Reservas, cuarto visitante, manipulación, JWT/cookie/refresh antiguos, cambio de rol, reutilización, reinicio y generaciones. |
| backend-demo-integracion-01 | PASS, 1 caso | DemoIT sobre API real, sin omisiones. |
| roles-diagnostico-03 | PASS, 18 controles | CONNECT efectivo: 15 rechazos explícitos por HBA/autorización y 3 conexiones autorizadas. |
| ciclo-avanzado-02 | PASS, 56 controles | Copia/restore a QA nueva, caducidad con operación en vuelo, drenaje al arrancar y fallo seguro de reciclaje. |
| cuota-almacenamiento-01 | PASS, 6 controles | Bloquea escritura y nueva reserva; permite lectura, logout, liberación y drenaje. Configuración original restaurada. |
| e2e-demo-diagnostico-04 | PASS, sin retries | Recorrido de navegador; PUT incluye proveedor/supervisor UUID y conceptos. No explica por sí solo los fallos anteriores. |
| plazo-arranque-prueba | PASS dirigido | Reloj simulado:60s PostgreSQL +40s web supera el presupuesto conjunto de90s y se rechaza. No mide un arranque real. |
| Regresión backend final01 | FAIL conservado | 149 unitarias correctas y1fallo entre128 IT: OpenAPI21 esperado,22 observado. |
| Regresión backend final02 | PASS | 149 unitarias y128 IT,0omisiones; Spotless/SpotBugs correctos. @Hidden excluye el controlador404 de la documentación fuera de demo; aserción21 intacta. |
| Regresión API final01 | PASS, 636 controles | Sesiones88, proveedores78, solicitudes119, aprobaciones140, concurrencia67 e historial144. Persistencia, caída real503 y recuperación200 también correctas con navegador. |
| E2E demo final01 | FAIL conservado | PUT con proveedorNULL y supervisorUUID. Causa localizada en selección durante recarga de catálogo; corregida y comprobada posteriormente. |
| E2E regresión final01 | No ejecutada | Fallo de carga del wrapper ESM/CJS antes de los33casos. Adaptador corregido sin cambiar aserciones. |
| E2E final03 | PASS funcional,0reintentos; defecto visual | Demo1caso y regresión33casos. La inspección posterior de capturas muestra61min; ese valor no tenía aserción E2E y no se declara correcto. |
| E2E demo final04 | PASS,0reintentos | Contador60min exigido en tres reservas y ambas capturas; misma navegación real por roles y aislamiento. Capturas de escritorio y móvil inspeccionadas en revisión independiente. |
| E2E regresión final04 | FAIL conservado | 27PASS/6FAIL por ausencia de variables de fixtures en el lanzamiento del coordinador. Se repite con referencias existentes; ninguna aserción modificada. |
| E2E regresión final05 | PASS,0reintentos | 33casos con referencias existentes de fixtures. La guarda del lanzador ahora rechaza su ausencia antes de comenzar. |
| Arnés HTTP03 | PASS, no benchmark | Semilla300solicitudes/1500conceptos, tres recorridos y sobrecupo correctos; preparación84,2s. No acredita65min ni capacidad. |
| Auditorías finales | PASS con fuente fechada | npm producción/completa0vulnerabilidades; OSV offline132componentes contra base local2026-10-15, sin hallazgos. No es garantía frente a vulnerabilidades futuras. |
| Configuración TLS01 | PASS limitado | nginx -t y Compose válidos con certificado QA autofirmado; sin publicación ni comprobación DNS/confianza. |
| Recuperación desde archivo01 | PASS | 12 pruebas offline y restauración real del `.enc` guardado:16,68s total,6,93s restauración/invalidez. QA nueva, snapshot cotejado, fuente/control/copia intactos,0sesiones/refresh activos. ACL y registro runtime comprobados; no se presenta como conexión efectiva de cada rol. |
| A1 completa, arnés inicial | FAIL conservado | 65min completos;180/180recorridos nominales correctos. Fallan las dos sondas de caducidad:200 observado frente a401 esperado. No acredita capacidad ni activa por sí solo el perfilC. |
| Caducidad frontera02 | PASS,3casos | PostgreSQL real y servicio/filtro reales con Clock fijo solo en el test;−1µs permite, igualdad/+1µs rechazan401 con fila RESERVADO intacta y sin reconciliador. El primer intento se detuvo por formato; se conserva. JAR final02 intacto. |
| Variante reloj offline01 | PASS,78casos | 34barrera+12observador+32evaluador. Casos sintéticos separados de medición; no acreditan capacidad. |
| Observador real01 | PASS,2lecturas | Lee los eventos originales B/C de A1, verifica TTL60min y caducidad posterior. Solo lectura de eventos históricos; no sustituye cuatro ventanas nuevas. |
| Variante reloj offline02 | PASS,83casos | 34barrera+16observador+33evaluador, tras corregir precisión JDBC/SQL; la cadena privada ESPERANDO→CADUCADA no suma tráfico HTTP. |
| Observador real02 | PASS | Conserva los Instant originales de nueve decimales y comprueba ambos empates y acarreo anual en PostgreSQL. Las reservas ya liberadas del arnés producen ESPERANDO; límite explícito. |
| Arnés HTTP04 | PASS | Semilla de300solicitudes/1500conceptos, tres recorridos y sobrecupo; fuera del benchmark. |
| Variante corregida A/B | Pendiente | Debe fijarse y comprobarse el método temporal antes de cuatro pasadas comparables. Sin recomendación de capacidad. |

La operación admitida en el ensayo avanzado terminó en su base de origen antes del reciclaje. Una conexión ajena de QA impidió recrear y produjo BLOQUEADO, sin terminarla por la fuerza ni borrar datos. Tras finalizar naturalmente e identificar la causa, una intervención privada explícita permitió continuar. Los eventos de control se conservaron. Las restauraciones usan bases nuevas distintas y dejan la fuente intacta; sesiones y refresh copiados se invalidan en QA.

## Incidencias y correcciones

- Antes de leer la prohibición adjunta se ejecutó `git status --short`: salida vacía, sin mutación. Se informó inmediatamente; ningún otro comando Git.
- Docker npipe fue rechazado en sandbox. Se usó elevación formal para el laboratorio autorizado; no intermediarios ni cambios globales.
- El primer patch documental fue rechazado por una ruta duplicada y no escribió; se corrigió el método.
- Aislamiento01 falló por rutas temporales nginx en sistema de solo lectura. Se configuraron las rutas en `/tmp`. Aislamiento02 llegó a44 controles y falló por un socket keep-alive obsoleto del cliente QA tras operaciones Docker síncronas. El cliente usa conexión nueva; no se reintentan mutaciones. Aislamiento03 pasó.
- La revisión detectó un arranque declarado sin esperar salud y un rechazo CONNECT demasiado genérico. Ambos criterios se endurecieron y comprobaron. El plazo de arranque de perfil ahora es conjunto; no se renueva por servicio. También se conserva el bloque NMT del reinicio para distinguir memoria reservada/comprometida de RSS.
- E2E observó referencias nulas al guardar. La traza final mostró que la espera capturaba una consulta anterior: la selección llegaba durante la recarga, la guarda la rechazaba y el DOM conservaba un UUID distinto del modelo. El selector restaura ahora el valor adoptado cuando rechaza el cambio; una prueba determinista reproduce el defecto. El E2E espera la consulta filtrada exacta y comprueba ambas referencias persistidas. Final02 y final03 pasan; fallos anteriores conservados, sin retries ni aserciones relajadas.
- El contador tomaba la hora anterior a la reserva y podía mostrar61min. La primera corrección sincronizó la hora al responder y pasó su prueba determinista, pero las capturas finales03 seguían mostrando61min. El E2E no comprobaba el valor. La segunda corrección limita el indicador a la duración anunciada por la API, sin modificar caducidad. Final04 exige60min y pasa; las tres reservas mostraron un resto sin acotar de60min+294–302ms según el reloj del navegador. El descenso se verifica con reloj unitario simulado, no se presenta como espera E2E real.
- Arnés01 detectó una expectativa CSRF200 incorrecta: el contrato exige204. Arnés02 detectó que su modo previo omitía los desfases oficiales y provocaba429; comparte ahora los mismos desfases0/1/2s. Arnés03 pasa sin cambiar límites, introducir reintentos ni suavizar expectativas. Los dos fallos permanecen conservados.
- Windows registró un arranque a13:24:05 y Docker quedó detenido. El humano confirmó el cierre y pidió repetir. Se recuperaron únicamente servicios propios AG-016 hacia13:28. Avanzado01 quedó interrumpido tras una restauración correcta y no cuenta como ensayo completo. Se conservó su QA y se utilizó `ag016_restore_qa_funcional_02`, previamente inventariada, para avanzado02. Un archivo de pruebas quedó con NUL tras la interrupción; se reconstruyó y verificó.

## Dimensionamiento en curso

La primera tentativa `carga-a1` inició su ventana el2026-10-16 a14:12:08CEST.
Se interrumpió al detectar el defecto visual del contador, para fijar una única
versión final antes de las cuatro pasadas. Se conservaron muestras y marca de
interrupción; no es una pasada completa ni acredita capacidad. Se detuvieron solo
sus dos procesos Node identificados, sin tocar servicios Docker ni recursos previos.
Duración observada de esa tentativa:98,6s. La pasada `carga-final-a1`, con el
contador comprobado, comenzó a14:24:54CEST y completó65min. El generador terminó
con FAIL y el muestreador cerró a15:30:04CEST.

Los180recorridos nominales fueron válidos. Los p95 por operación cumplieron sus
umbrales: el mayor p95 de lectura nominal fue39,498ms; escritura15,312ms y
login160,688ms. No se promedian percentiles. La RAM nominal máxima observada en muestras fue756,95MiB
incluida la reserva SO/Docker, con63,04% de margen. Son observaciones parciales
de una pasada fallida, no una recomendación de perfil.

Las dos sondas de caducidad recibieron200, y el arnés dejó pausados esos visitantes.
Su programación mezclaba expiraEn del servidor con UTC de Windows y añadía25ms,
sin comprobar el desfase. Las sondas ocurrieron525ms antes de completar60min desde
la recepción de cada reserva. La [lectura posterior de eventos y relojes](../../qa/evidencias/ag016/diagnostico-caducidad-a1/resultado.json)
confirma caducidad persistida a60min+498,422ms y+188,131ms desde RESERVADA, sin
ampliación del TTL por reinicio. Las lecturas posteriores presentan un desfase
variable, pero no reconstruyen exactamente el reloj durante las sondas fallidas.

Se conserva FAIL y la [evaluación original](../../qa/evidencias/ag016/carga-final-a1/evaluacion.json).
Las fuentes concretas que cambiarán se conservaron con huellas, y el contrato
original permanece intacto. La revisión identificó además que el ensayo avanzado
exigía401 después de DRENANDO; no aislaba la frontera temporal mientras la fila
seguía RESERVADO. La IT dirigida pasó3casos con PostgreSQL real y Clock fijo en el
test. La variante observa el evento persistido de la generación original antes de
una única GET401, dentro de120s desde la referencia monotónica y dentro de65min.
No se suaviza la respuesta401 ni se reintenta una sonda fallida.

La [revisión de la variante](../../qa/evidencias/ag016/revision-variante-reloj.md)
cerró un hallazgo de precisión: el cast textual de PostgreSQL usa empate al par,
mientras JDBC42.7.13 redondea half-up. El observador normaliza solo el parámetro SQL
como JDBC y conserva el Instant original en la evidencia. SELECT real, bytecode,
pruebas de empates/acarreo y nueva integración readonly confirmaron la corrección.

A=2GiB/1vCPU y B=4GiB/2vCPU: dos pasadas completas por perfil, cada una de10min calentamiento,30 nominal,5 pico y20 operación. C solo si A y B fallan. Misma versión, semilla160082026 y mezcla; tres visitantes con20 proveedores y100 solicitudes de5 conceptos por espacio al comienzo. Copia, restore, reinicio, caducidad y reciclaje se registran separadamente de tráfico útil y errores imprevistos. El sobrecupo durante el pico debe devolver409 y nunca conceder una reserva.

El presupuesto incluye Java, PostgreSQL, nginx, supervisor y una reserva explícita para SO/Docker. Las cuotas cgroup sumadas no aíslan el sistema operativo compartido de Docker Desktop. Se registrarán p50/p95/p99, muestras, tasas, RAM/caché/heap/nativa, CPU/throttling, conexiones, OOM, reinicios, swap e I/O. Los umbrales no se modificarán después de observar resultados. La recomendación, si se sustenta, será provisional hasta repetir en VPS real.

La igualdad de datos se aplica a los tres espacios activos: la misma semilla de
negocio se comprueba antes de cada ventana. El control operativo y las QA creadas
por ensayos anteriores se conservan, por lo que el disco total no vuelve a su
estado inicial. Las métricas registran tamaños y conexiones de esas bases. El
arranque en frío significa procesos detenidos; no se purga la caché del host.
El muestreo tiene una cadencia objetivo de10s: sus máximos describen las muestras,
no garantizan capturar todo pico subsegundo. OOM y reinicios también se verifican
con contadores persistentes y el estado de los contenedores.

## Documentación y pendientes de cierre

Guías: [demo por rol](../demo-008.md), [operación](../operacion-demo-008.md), [capacidades para portfolio](../capacidades-portfolio.md) y [contratos para el capítulo privado008](../contratos-capitulo-008.md). No se crea el manual privado en el repositorio ni se modifica la web personal.

Pendientes: cuatro pasadas A/B, análisis, revisión final, matriz DO/AIS, manifiesto/sello e inventario final. Proveedor, compra, DNS, certificados/secretos reales y activación pública siguen reservados al humano.
