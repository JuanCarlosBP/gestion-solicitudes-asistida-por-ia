# ADR-0002 — Política de dependencias transitivas

**Estado:** Aprobado por instrucción humana expresa para AG-006.
**Fecha:** 2026-10-13.
**Ámbito:** 001-base-verificable; revisión al cambiar la versión mayor frontend.

## Contexto

AG-004 se detuvo ante Rolldown preliminar y AG-005 ante Gensync preliminar.
Sus resultados y bloqueos fueron correctos bajo las instrucciones entonces vigentes.
[ADR-0001](ADR-0001-dependencia-transitiva-rolldown-angular-21.md) conserva esa historia.
Una etiqueta preliminar informa sobre madurez semántica, no demuestra vulnerabilidad.
La autorización AG-006 sustituye la prohibición absoluta por controles verificables.
No altera requisitos, endpoints, arquitectura ni líneas mayores aprobadas.

## Alternativas

1. Rechazar toda etiqueta preliminar: descartado por decisión humana.
2. Forzar sustituciones internas: descartado por riesgo de incompatibilidad.
3. Conservar la cadena oficial estable y verificarla: alternativa aprobada.

## Dependencias directas

Las seleccionadas por el proyecto serán estables y fijadas exactamente.
Procederán de registros oficiales y respetarán las líneas aprobadas.
No se seleccionarán alpha, beta, rc, next, canary, snapshot o nightly.
Tampoco preview ni milestone, aunque permitan instalar el conjunto.
Una directa preliminar bloquea su tarea, no automáticamente todo el incremento.
Se conservarán manifiestos, lockfiles y gestión de dependencias Maven.

## Transitivas controladas

Una transitiva preliminar puede aceptarse si satisface todos estos controles:

- Llega mediante una directa estable de origen oficial.
- No está añadida directamente ni importada por código del proyecto.
- Está fijada en el lockfile o gestor equivalente.
- Conserva origen e integridad verificables.
- No necesita overrides, resolutions, force ni legacy-peer-deps.
- No necesita editar node_modules ni desactivar integridad o TLS.
- La instalación reproducible funciona.
- Los builds y las pruebas aplicables pasan.
- No tiene vulnerabilidad alta o crítica aplicable sin tratamiento seguro.
- Su cadena y riesgo restante quedan documentados.

La ausencia de repositorio o licencia opcionales es una advertencia por sí sola.
No sustituye la comprobación de origen, integridad, cadena y uso indirecto.
El inventario estático es provisional hasta completar instalación, auditoría y QA.

## Cadenas autorizadas expresamente

- `@angular/build@21.2.26 → rolldown@1.0.0-rc.4`.
- Bindings y subpaquetes oficiales `@rolldown/*` de esa familia.
- `@angular/build@21.2.26 → @babel/core@7.29.7 → gensync@1.0.0-beta.2`.
- `@angular/compiler-cli` estable 21 → Babel 7.29.7 → Gensync beta.2.

No se añadirán Rolldown, Gensync o bindings como directas ni se importarán.
Las demás transitivas se evalúan con la misma regla, sin decisiones por paquete.
No se crea un ADR por cada paquete preliminar.

## Evidencia y auditoría

`qa/verificar-dependencias-preliminares.mjs` recorre el lockfile completo.
Informa directas, transitivas, cadenas, origen, integridad y clasificación.
Se ejecutan `npm ci`, `npm explain`, `npm ls --all` y builds/pruebas.
Se conservan auditorías JSON de producción y del conjunto completo.
Un código no cero de npm audit exige analizar el hallazgo, no una parada automática.
Se evalúan severidad, uso real, cadena, parche disponible y mitigación.
Hallazgos bajos/moderados o no aplicables se documentan sin ocultarlos.
Un fallo de red admite dos reintentos; si persiste, la aceptación queda pendiente.
No se usa `npm audit fix --force`.

## Bloqueos y continuidad

Integridad incorrecta, origen no autorizado o incompatibilidad bloquean la tarea.
También una directa preliminar o una alta aplicable sin tratamiento seguro.
Dos correcciones fallidas del mismo problema bloquean esa tarea y sus dependientes.
El trabajo independiente autorizado continúa.
Una etiqueta prerelease transitiva nunca bloquea por sí sola.

Solo detienen toda AG-006 los bloqueos globales definidos por la orden humana:
pérdida de confinamiento, secretos reales necesarios, integridad global alterada,
cambio de alcance/requisito/arquitectura/versión mayor o crítica aplicable sin mitigación.
También recursos esenciales inutilizables tras comprobación, escalación y corrección,
imposibilidad de construir/probar partes sustanciales, incoherencia irrecuperable,
fin de las diez horas o falta de tiempo para un cierre coherente y honesto.

## Consecuencias y revisión

Se acepta riesgo residual de madurez en herramientas transitivas oficiales.
Origen oficial e integridad no garantizan ausencia de defectos o vulnerabilidades.
Los controles técnicos siguen siendo obligatorios y la aceptación final es humana.
Se revisará esta decisión al cambiar la versión mayor del frontend.
Los parches compatibles autorizados requieren regenerar y verificar sus evidencias.
La historia de AG-003, AG-004 y AG-005 permanece conservada.
