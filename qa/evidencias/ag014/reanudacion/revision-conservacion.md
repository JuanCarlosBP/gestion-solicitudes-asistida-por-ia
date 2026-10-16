# Revisión previa del modo de conservación de contenedores

15/10/2026, Europe/Madrid. Dictamen del revisor independiente revision_007,
transcrito por el coordinador antes de ejecutar HistorialIT. Solo lectura, sin
pruebas, Git ni escrituras del revisor. No equivale a aceptación humana.

El usuario prohíbe eliminar contenedores, volúmenes e imágenes durante esta
reanudación. Se revisó el helper de pruebas ContenedoresPrueba y las rutas reales
de Testcontainers2.0.5 mediante su bytecode. Con reuse global activo y contenedor
reutilizable se omite ResourceReaper.register; Ryuk queda bajo demanda sin
arrancar y no se selecciona el reaper alternativo de cierre JVM.

Configuración exacta revisada:

- GESTION_QA_CONSERVAR_CONTENEDORES=true.
- TESTCONTAINERS_REUSE_ENABLE=true.
- TESTCONTAINERS_RYUK_DISABLED=false.

El helper valida esos requisitos y la versión antes de arrancar. Cada instancia
lleva una etiqueta UUID distinta que impide reutilizar datos de otra prueba.
Su cierre inspecciona y detiene el contenedor; no invoca remove. El cierre tras
fallos también usa ese método. Las ocho IT no habilitan redes auxiliares, binds
ni reenvío de puertos que creen otro contenedor con limpieza automática.

Dictamen enfocado: sin objeción técnica para iniciar las 13 HistorialIT con esa
configuración. La conservación dinámica exige comparar inventarios antes/después;
este dictamen previo no afirma una ejecución ni una preservación todavía no medidas.

El implementador aportó backend-transformacion-helper-01.csv: revertir únicamente
el cambio de factory/import en memoria recupera las ocho huellas anteriores.
Los asserts no se modifican con ese ajuste. La revisión final debe cotejar esa
evidencia y los resultados reales, junto con el resto de verificaciones007.
