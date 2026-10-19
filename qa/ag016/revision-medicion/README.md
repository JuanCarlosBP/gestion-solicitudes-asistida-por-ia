# Correcciones reproducibles de la medición AG-016

Se conservan los ejecutables exactos externos utilizados para revisar A1/A2 y
planificar B1/B2. No se reescriben `../evaluar.mjs`, `../carga.mjs` ni las evidencias
originales: sus huellas forman parte de los recibos históricos.

`evaluador-v5.mjs` reconstruye cada recorrido de las peticiones crudas. La versión
v4 corrige la comparación entre cronómetros que no arrancaron en el mismo instante.
`planificador-carga.cjs` prepara una copia **fuera del repositorio** con agenda por
enteros; `carga-canonica-corregida.mjs` es su plantilla de comparación, no debe
invocarse directamente desde esta carpeta porque sus imports pertenecen a la copia
que construye el planificador junto a las dependencias del laboratorio.

Los tests `regresion-a2.test.mjs` leen las fuentes/evidencias históricas A1/A2 desde
la raíz del repositorio. Los tests offline no vuelven a generar carga. No ejecutar
`evaluar-pasada-v5.mjs` para sobrescribir un reanálisis existente: se detiene para
conservar los resultados. Los 260 minutos completos no se repiten por este archivo.

Resultado histórico: cuatro pasadas PASS tras revisar los defectos del arnés;
no prueba automáticamente un despliegue público, nuevas cuotas ni otra versión.
