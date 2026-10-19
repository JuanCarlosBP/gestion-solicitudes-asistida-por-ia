# Trabajar en Gestión de Solicitudes

## Primero: saber qué se va a cambiar

Lee `AGENTS.md` y la especificación del incremento. No cambies una regla de negocio
para hacer pasar una prueba. Anota el problema, el comportamiento esperado y la
prueba que lo demuestra. Conserva los resultados fallidos con su causa.

**Rama** significa una línea de trabajo en Git. **Commit** guarda una versión
identificada. **Pull request (PR)** propone integrar esa línea con `main`. **CI**
son las comprobaciones automáticas de GitHub. No son lo mismo que desplegar.

## En qué carpeta se ejecutan las comprobaciones

En Windows, abre PowerShell en la raíz del repositorio. Para Angular entra en
`frontend`; para Maven entra en `backend`. No uses una terminal conectada al VPS
para ejecutar comandos destinados al ordenador de desarrollo.

Frontend, con las dependencias ya instaladas según el entorno del proyecto:

```powershell
Set-Location frontend
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

Backend, desde su carpeta y con Docker local disponible para PostgreSQL de pruebas:

```powershell
.\mvnw.cmd -B -ntp verify
```

`verify` ejecuta los controles configurados: no publica en GitHub ni despliega.
No uses opciones de omitir pruebas para acreditar una entrega.

## Antes de proponer una integración

Comprueba código, formato, pruebas, documentación, enlaces y ausencia de secretos.
Revisa qué archivos se preparan para el commit; nunca añadas `.env`, claves,
contraseñas, dumps privados, dependencias ni binarios de compilación al repositorio.
Los informes históricos se conservan. Si una evidencia contiene datos sensibles,
se prepara una versión pública sanitizada, sin falsificar el resultado.

Los cambios de Git y despliegue los realiza la persona responsable, salvo una
autorización explícita. Se conserva el historial con merge commits; no se exige
reescribir commits publicados ni forzar envíos.

## Dos entornos, dos propósitos

La demo pública solo utiliza datos ficticios y roles temporales. El laboratorio
local permite pruebas internas de API/Swagger y administración. No traslades las
credenciales de uno al otro. La configuración Docker y las instrucciones de
operación deben indicar siempre el proyecto y los archivos de entorno autorizados.

[Guía para empezar](docs/manual-usuario/recorrido-entrevista.md) ·
[Estado verificable](docs/cierre/008-estado.md)
