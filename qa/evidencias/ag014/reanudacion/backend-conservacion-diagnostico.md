# Conservación de recursos de PostgreSQL durante QA

Fecha: 2026-10-15, Europe/Madrid. Reanudación autorizada de AG-014.

## Alcance y comprobación previa

Se añade exclusivamente un helper de pruebas y se cambian las ocho construcciones
de PostgreSQLContainer para usarlo. Producción, migraciones y aserciones permanecen
sin modificaciones. No se ejecutó Docker al obtener este diagnóstico.

Comando ejecutado desde backend con Java21 y cachés/TEMP del workspace:
`mvnw.cmd -B spotless:apply test-compile -DskipTests`.
Resultado: BUILD SUCCESS, compiladas23clases de pruebas; Spotless PASS.
Registro: backend-conservacion-compilacion-01.log.

## Modo opcional

Variables por proceso, sin configuración global:

```text
GESTION_QA_CONSERVAR_CONTENEDORES=true
TESTCONTAINERS_REUSE_ENABLE=true
TESTCONTAINERS_RYUK_DISABLED=false
```

El helper comprueba las tres condiciones y Testcontainers2.0.5 antes de crear
PostgreSQL; antes de start comprueba también reuse y canBeReused. Una combinación
distinta falla temprano. La etiqueta aleatoria gestion.qa.instancia distingue
cada instancia, por lo que no reutiliza la base de otra prueba o ejecución.

La inspección javap de las dependencias locales2.0.5 confirmó:

- RyukResourceReaper.init no arranca Ryuk cuando environmentSupportsReuse=true.
- GenericContainer con reuse habilitado omite ResourceReaper.register y no añade
  org.testcontainers.sessionId. DEFAULT_LABELS tampoco contiene sessionId.
- Sin registro, Ryuk permanece sin iniciar; esta ruta no instala el hook de
  JVMHookResourceReaper. RYUK_DISABLED=true seleccionaría ese otro reaper y por
  ello se rechaza en el helper.
- stop del helper ejecuta inspect/stop/inspect, sin llamar a super.stop. close
  delega a stop; repetir el cierre conserva el recurso detenido.
- Ninguna prueba crea redes auxiliares o registra recursos en ResourceReaper.
  Los volúmenes anónimos quedan asociados a los contenedores conservados.

BaseVerificableIT mantiene la caída real de PostgreSQL y su aserción503. Los
reinicios de las otras pruebas reinician Spring sobre la misma base. Ninguna
prueba llama start después de stop sobre la misma instancia PostgreSQL.

## Ejecución pendiente al escribir este diagnóstico

13IT de HistorialIT y verify completo requieren revisión previa del helper.
Se ejecutarán con user.home de las JVM de pruebas confinado a tmp/pruebas-backend,
javaagent Mockito ya validado y acceso Docker autorizado fuera del sandbox.
Los inventarios anterior/posterior deben conservar todos los IDs de contenedores,
volúmenes e imágenes. No se autoriza remove, prune, reset ni eliminación manual.
Los contenedores nuevos se identificarán por etiqueta y se comprobarán detenidos
y presentes después del cierre de la JVM. Evidencia anterior no se sobrescribe.
