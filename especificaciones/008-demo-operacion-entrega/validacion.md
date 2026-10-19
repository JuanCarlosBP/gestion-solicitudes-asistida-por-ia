# Validación008 — adenda de publicación y pulido

**19/10/2026.** Esta adenda prevalece sobre los pendientes históricos de AG-016,
sin alterar sus informes originales. El cierre de código, el despliegue y la
aceptación operativa son tres comprobaciones distintas.

| Área | Estado y evidencia actual |
|---|---|
| Aislamiento/roles/flujo | Pruebas API y navegador previas, y 132 controles del recorrido público del pulido. |
| Capacidad | Cuatro ventanas completas de65min, A1/A2/B1/B2, revisadas; no faltan esas ventanas. |
| HTTPS | Despliegue público acreditado y ensayo de renovación del certificado satisfactorio. |
| Interfaz | 592 pruebas Angular, previsualización real y prueba posterior a instalar;72 capturas revisadas. |
| Git/CI | La PR y el commit de integración aportan el resultado de esta revisión; no se anticipa antes de ejecutarlos. |
| Recuperación | Copia inicial cifrada, descarga externa y restauración de una base QA acreditadas; recuperación global y política externa periódica pendientes. |
| Operación final | Reinicio completo del VPS y prueba con PC apagado pendientes; no los sustituye reiniciar contenedores. |

[Revisión de cierre](../../docs/cierre/008-estado.md) ·
[Resultado público](../../qa/evidencias/ag019/revision-pulido/publico/resultado-ui.json) ·
[Análisis de capacidad](../../qa/evidencias/ag019/capacidad/REVISION_CAPACIDAD_008.json)

La CI conserva las pruebas previas y añade la demo en un entorno efímero. El nuevo
control OpenAPI comprueba el inventario del contrato; no sustituye las peticiones
reales de API y navegador.

---
## Validación de AG-016 conservada en su corte original

# Validación008 — AG-016

Estado: implementación local comprobada; dimensionamiento y cierre en curso.
Esta matriz registra evidencia observada y no sustituye la aceptación humana.
La autorización y los límites se recogen en la [especificación](especificacion.md).

## Criterios de entrega

| Criterio | Estado observado | Evidencia y límite |
|---|---|---|
| DO-01 | Verificado localmente | [Aislamiento49controles](../../qa/evidencias/ag016/aislamiento-http-03/resultado.json), [E2E demo final04](../../qa/evidencias/ag016/e2e-demo-final-04/ejecucion.json): tres reservas exclusivas, cuarto rechazado y contador60min explícito en reservas/capturas. Descenso comprobado con reloj unitario simulado. |
| DO-02 | Parcial; dimensionamiento en curso | Topología e imágenes finales disponibles; [perfil A1 final](../../qa/evidencias/ag016/perfil-final-a1/perfil.json) verifica cuotas y arranque16,6s. Faltan cuatro ventanas y análisis. La reserva SO/Docker es una aproximación, sin equivalencia a un proveedor. |
| DO-03 | Verificado localmente | Aislamiento, regresión y [configuración TLS](../../qa/evidencias/ag016/tls-configuracion-01/resultado.json). Sin reserva válida no hay destino por defecto. Certificado QA autofirmado; DNS/confianza pública pendientes. |
| DO-04 | Verificado localmente | [18 controles de roles/CONNECT](../../qa/evidencias/ag016/roles-diagnostico-03/roles.json), runtime/provisión separados y secretos por archivo. Sin socket Docker ni permisos administrativos en HTTP. |
| DO-05 | Verificado localmente | E2E demo y [frontend528casos](../../qa/evidencias/ag016/frontend-final-04/README.md): tres roles reales, guías, cuentas por generación, sin administrador público. |
| DO-06 | Verificado localmente; medición repetida pendiente | [Restore funcional](../../qa/evidencias/ag016/ciclo-avanzado-02/restore.json) y [recuperación desde archivo guardado](../../qa/evidencias/ag016/recuperacion-archivo-01/restauracion-archivo.json): QA nueva, fuente/control intactos, snapshot cotejado y sesiones copiadas invalidadas. Recuperación completa16,68s;12pruebas offlinePASS. RPO/RTO propuestos requieren decisión humana. |
| DO-07 | Verificado localmente | [Ciclo avanzado56controles](../../qa/evidencias/ag016/ciclo-avanzado-02/ciclo-avanzado.json) y [supervisor9controles](../../qa/evidencias/ag016/supervisor-real-01/resultado.json): drenaje, reinicio, bloqueo seguro, intervención privada documentada y reciclaje automático. |
| DO-08 | Documentado; revisión de cierre pendiente | [Guías](../../docs/demo-008.md), [operación](../../docs/operacion-demo-008.md), [capacidades](../../docs/capacidades-portfolio.md) y [contratos capítulo008](../../docs/contratos-capitulo-008.md). Sin manual privado ni cambios a web personal. |
| DO-09 | Verificado localmente | Backend277casos, frontend528, API636, E2E demo1 y regresión final05:33PASS,0reintentos. El fallo04 por fixtures omitidos queda conservado. [Informe](../../docs/trazabilidad/AG-016-informe.md). Aislamiento precedió la regresión; no acredita publicación ni VPS. |
| DO-10 | En curso | Informe y evidencia de fallos conservados. Pendientes matriz A/B, recomendación, revisión final, manifiesto, sello e inventario final. |

## Aislamiento y seguridad

| Criterio | Estado observado | Comprobación |
|---|---|---|
| AIS-01 | Verificado localmente | Filtro antes de JWT/sid y JDBC de negocio; selector sin cookie, contexto ausente y manipulación rechazados. Aislamiento03 y DemoIT incluidos en backend final02. |
| AIS-02 | Verificado localmente | A/B separados, auditor limitado al espacio, cuentas/JWT/refresh/cookies antiguos rechazados y cambio de rol real. Aislamiento03 y [E2E demo final04](../../qa/evidencias/ag016/e2e-demo-final-04/ejecucion.json). |
| AIS-03 | Verificado localmente | Inventario cerrado, usuarios por base y18controles de conexión:15rechazos y3conexiones autorizadas; plantilla0/1 sin modificación ACL. |
| AIS-04 | Verificado localmente | Limpieza de contexto, sin herencia asíncrona ni fallback; pools máximos3por espacio+2control. Pruebas backend y aislamiento con reutilización. Conexiones bajo carga pendientes de matriz. |
| AIS-05 | Verificado localmente | Ámbito espacio/generación/usuario en memoria, Web Locks y almacenamiento; epoch ignora respuestas antiguas. Pruebas frontend y regresión de concurrencia/idempotencia. |
| AIS-06 | Verificado localmente | Ciclo avanzado02: operación real bloqueada5s, nueva admisión401 tras DRENANDO y operación ya admitida201 antes de reciclar. [Caducidad frontera02](../../qa/evidencias/ag016/backend-caducidad-frontera-02/ejecucion.json): PostgreSQL real, servicio/filtro reales y reloj fijo del test;3casos PASS en−1/0/+1µs, conservando RESERVADO/expiración y sin reconciliador. Complementan coberturas distintas. |
| AIS-07 | Verificado localmente | Drenaje persistente al reiniciar; conexión QA ajena impide recrear, deja BLOQUEADO sin terminarla por fuerza; restore invalida sesiones. Ciclo avanzado02 y supervisor real01. |
| AIS-08 | Verificado localmente | [Cuota6controles](../../qa/evidencias/ag016/cuota-almacenamiento-01/resultado.json), límites de entrada/reserva/autenticación y errores sanitizados; logout/liberación disponibles al alcanzar cuota. Revisión de evidencia de cierre pendiente. |
| AIS-09 | Parcial; inventario final pendiente | Proyecto AG-016 exclusivo, propietario Docker único, ID/servicio/proyecto comprobados. [Preflight](../../qa/evidencias/ag016/preflight-medicion-01/estado.json): solo cuatro servicios propios activos y ningún recurso previo arrancado. |

## Secuencia y límites

Se conserva cada ejecución fallida. La interrupción del host dejó una prueba
avanzada incompleta; su repetición utilizó otra QA nueva inventariada. La corrección
del selector se apoya en una reproducción determinista y E2E posteriores, sin
reintentos ni relajación de aserciones. El adaptador E2E cambió el transporte de
comandos, manteniendo los33contratos originales.

Las cuatro pasadas deben usar artefactos, mezcla y parámetros idénticos. Los fallos
inducidos se separan de errores inesperados. Una pasada incompleta no se presenta
como superada ni basta para recomendar recursos. Proveedor, compra, DNS, secretos
reales, publicación, Git y aceptación final corresponden al humano.
