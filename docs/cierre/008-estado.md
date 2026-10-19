# Revisión técnica de 008 — 19 de octubre de 2026

## Hechos contrastados

El ZIP `DEVOLVER_PULIDO_008(1).zip` contiene 193 archivos inventariados: tamaños y
SHA-256 coinciden. Se han inspeccionado las 72 capturas públicas (9 estados ×
8 anchos) mediante láminas comparativas y ampliaciones de los estados relevantes.
Las capturas muestran la portada aprobada, instrucciones de acceso con formulario
conservado, botones separados, referencias seleccionadas y precios sin ceros sobrantes.

Los recibos aportados declaran 592/592 pruebas Angular, typecheck, lint, formato y
build satisfactorios. Previsualización y versión pública tienen 132/132 controles
cada una. Las búsquedas reales cubren nombre completo, fragmento, botón, Enter,
sin resultados y borrado, para proveedor y supervisor. Las selecciones llegan al
PUT real. No se han repetido aquí las cargas ni la CI del nuevo commit.

Versión UI instalada: `ui-20261019142334`.
Imagen frontend: `sha256:77feece8334f41295b3633d0f51723a11d269c8723dcf690cd4b2e7558f96145`.
Base pública: `publico-20261019045121`.
Backend, PostgreSQL y provisionador se conservaron en esta actualización.

[Recibo del VPS](../../qa/evidencias/ag019/revision-pulido/vps-resultado.json) ·
[Pruebas públicas](../../qa/evidencias/ag019/revision-pulido/publico/resultado-ui.json) ·
[Búsquedas reales](../../qa/evidencias/ag019/revision-pulido/publico/busquedas-reales.json)

## Interpretación visual y límites

Los seis requisitos del pulido están cubiertos en la evidencia recibida. No se
observan desbordamientos horizontales en las 72 combinaciones y no aparecen
solapamientos de botones o pérdida de las selecciones corregidas. Las tablas se
reorganizan como bloques en móvil. El diseño es sobrio y consistente con la portada.

Las páginas son largas en móvil: no se confunde eso con un desbordamiento. Algunas
capturas se tomaron mientras el historial secundario mostraba «Cargando historial»;
la captura posterior de auditoría contiene los hechos. En tableta la barra de
acciones adherente aparece sobre contenido en la captura de página completa:
esa imagen estática no demuestra por sí sola un control inaccesible al desplazarse.
No equivale a probar todos los teléfonos físicos, zoom, lectores de pantalla o todos
los estados posibles. Se conserva ese límite; no se declara una certificación de
accesibilidad ni perfección universal.

## GitHub y operación son cierres diferentes

El código observado de main antes de esta integración sigue en
`eaa0baec78ed9b99d8039ea7e6256b254be295d3`. La PR y sus ejecuciones mostrarán cuándo
se integró 008 realmente. Esta nota no simula una fusión ni una ejecución de CI.

La CI se amplía con un job de demo sobre un runner efímero, sin acceso al VPS ni
secretos del VPS. La prueba HTTP de CI valida el supervisor continuo y espera su
estado estable LISTO después de revocar una reserva; no fuerza manualmente el
reciclaje ni exige observar RECICLABLE durante una carrera con ese supervisor. La
prueba histórica de provisión manual se conserva sin cambios. Las suites HTTP y
navegador se separan por 61 segundos para respetar la ventana de reservas de Nginx,
sin reintentar peticiones fallidas ni desactivar límites. Conserva las suites previas,
añade inventario de OpenAPI y evita
que el Dockerfile convencional omita los archivos públicos de la portada.

Permanecen como cierre operativo separado: copias externas periódicas, recuperación
global, reinicio completo del VPS y comprobación desde otro dispositivo con PC
apagado. La copia inicial, la restauración de una base QA y el reinicio de
contenedores previos no se presentan como sustitutos de esas pruebas.

Después de ese cierre se consolida el prompt definitivo de Sites y el manual
integral privado. El manual debe incluir fundamentos, decisiones, carpetas, archivos,
Git, comandos, scripts, incidencias y defensa clic a clic. Esta nota no lo sustituye.
