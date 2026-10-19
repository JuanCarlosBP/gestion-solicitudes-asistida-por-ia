# Revisión independiente de recuperación desde archivo

Revisor: `revision_reanudacion`, solo lectura. El coordinador transcribe las
conclusiones recibidas el 2026-10-16 durante A1. No se ejecutaron pruebas, Docker,
Git ni compilaciones en esta revisión. No constituye aceptación humana.

El manual omitía la invocación de copia/restore y podía confundir el ensayo que
genera y restaura una copia en una misma ejecución con la recuperación posterior
de un archivo guardado. Se añadieron variables, precondiciones, resultados y
límites; el rollback quedó explícitamente como procedimiento propuesto/no ensayado.
La matriz se corrigió para enlazar el perfil final A1 y E2E demo04.

Dentro de DO-06 se preparó un helper independiente, sin cambiar las fuentes
congeladas de medición. Lee el `.enc` persistido y la clave externa, autentica
formato/hash/GCM antes de crear la QA fija nueva `ag016_restore_qa`, restringe
permisos, invalida credenciales copiadas y coteja el snapshot guardado. La fuente
actual y el control se comparan consigo mismos antes/después; no se exige que la
fuente siga igual que cuando se generó la copia. No hay borrados ni habilitación
del destino en el registro runtime.

El revisor detectó un hallazgo alto: un fallo de `pg_restore` podía propagar stderr
con contenido del dump antes del catch. Se corrigió la frontera usada por `psql`
y `pg_restore` para capturar sus salidas y sustituir el error sin serializar datos
crudos. Una prueba preparada atraviesa esa función con un hijo Node real fallido
y un marcador ficticio; observa stdout/stderr externos y el error serializado.

Huellas finales contrastadas, sin nuevos hallazgos estáticos:

- `qa/ag016/restaurar-archivo.mjs`: `02449d34a85188a656f9fc6edd0ad855a8f8720c44f669f47327d42e887ec3a2`.
- `qa/ag016/restaurar-archivo.test.mjs`: `d1e6ba47285a0386eab5a3d5a5803bf9f97d0902a22713f7a12ee6efd22d14d3`.

Estado al redactar: 12 pruebas preparadas, ninguna ejecutada. Quedan sintaxis,
pruebas offline y recuperación real desde archivo fuera de las ventanas de carga.
La revisión estática no equivale a verificación ejecutada ni acredita capacidad.

Ejecución posterior por el coordinador, fuera de cualquier ventana de carga:
[12 pruebas offline PASS](restauracion-archivo-offline-01/ejecucion.json) y
[recuperación real PASS](recuperacion-archivo-01/restauracion-archivo.json),
16,68s total. Se usó el archivo cifrado persistido en A1 y una QA inexistente;
snapshot cotejado, fuente/control/archivo/metadata intactos y cero sesiones/refresh
activos en el destino. Las ACL y la exclusión del registro runtime fueron
inspeccionadas; no se atribuyen conexiones efectivas a cada rol en este ensayo.
