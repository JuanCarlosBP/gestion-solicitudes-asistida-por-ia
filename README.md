# Gestión de Solicitudes

Aplicación personal para preparar solicitudes con conceptos e importes, revisarlas
como supervisor y consultar su historial como auditor. Java/Spring Boot en el
servidor, Angular en el navegador y PostgreSQL para los datos.

[![Comprobaciones del repositorio](https://github.com/JuanCarlosBP/gestion-solicitudes-asistida-por-ia/actions/workflows/ci.yml/badge.svg)](https://github.com/JuanCarlosBP/gestion-solicitudes-asistida-por-ia/actions/workflows/ci.yml)

## Probarla sin instalar nada

**[Presentación del proyecto](https://gestion-empresarial.jcbpsoftware.com/)** ·
**[Entrar directamente en la demo](https://gestion-empresarial.jcbpsoftware.com/demo)**

1. Pulsa **Reservar mi espacio** y después **Entrar como solicitante**.
2. Crea una solicitud, elige proveedor y supervisor, añade conceptos y preséntala.
3. Vuelve a **Demo sin liberar el espacio** y entra como supervisor para decidir.
4. Vuelve a Demo como auditor para consultar el historial. Libera al terminar.

No necesitas correo ni contraseña de prueba. El formulario **Acceso** se conserva
para mostrar la entrada con cuenta propia en una instalación convencional; la demo
utiliza una reserva temporal y tres roles. No introduzcas datos personales, claves,
archivos ni información real de empresas.

Cada visitante dispone de una base de datos independiente durante su reserva.
Hay tres espacios y la reserva dura 60 minutos. Si están ocupados, la aplicación
lo indica: no comparte un espacio usado con otro visitante. Los datos se reciclan.

**[Guía de uso en lenguaje sencillo](docs/manual-usuario/recorrido-entrevista.md)**

## Qué se puede comprobar

- Proveedores, borradores, conceptos e importes; presentar, aprobar o rechazar.
- Permisos por rol, sesión y recurso. El navegador no decide los permisos finales.
- Concurrencia e idempotencia: evitar sobrescrituras y duplicados de una operación.
- Historial de negocio y consulta por recurso. No se inventan hechos anteriores.
- Aislamiento de espacios y revocación de sesiones al liberar o reciclar la demo.

La búsqueda admite el nombre completo o parte de él. Los precios aceptan coma o
punto decimal; el servidor recibe cadenas normalizadas, sin pérdida de precisión.
Los precios unitarios no muestran ceros innecesarios; los importes finales muestran
dos decimales.

## Dónde mirar el código

| Carpeta | Qué contiene |
|---|---|
| `backend/` | Programa Java, API, reglas, seguridad, acceso a datos y pruebas. |
| `frontend/` | Pantallas Angular, componentes, estilos y pruebas de navegador. |
| `infraestructura/` | Imágenes Docker y configuraciones separadas de laboratorio y VPS. |
| `especificaciones/` | Qué se pidió en cada incremento y cómo se comprueba. |
| `docs/decisiones/` | Motivos de decisiones técnicas, alternativas y consecuencias. |
| `qa/` | Ejecutores y evidencias de las comprobaciones. |
| `.agents/` y `.codex/` | Instrucciones y roles de la asistencia de IA supervisada. |

[Mapa del proyecto](docs/mapa-del-proyecto.md) ·
[Decisión del despliegue público](docs/decisiones/ADR-0010-configuracion-publica-controlada.md) ·
[Cómo colaborar](CONTRIBUTING.md)

## Pruebas y límites de lo demostrado

La revisión de UI del 19/10/2026 conserva **592 pruebas Angular satisfactorias** y
**132 controles del recorrido público**, con 72 capturas de nueve estados en ocho
anchos (320–1920 píxeles). Es evidencia fechada, no un contador que se actualice solo.

La matriz local A/B comprende cuatro ventanas completas de 65 minutos: dos con
1 CPU/2 GiB y dos con 2 CPU/4 GiB. No equivale a cientos de usuarios ni a un SLA.

En GitHub Actions se comprueban backend, frontend, integración y la demo aislada.
El resultado vigente es el del badge y su ejecución concreta; un archivo de informe
antiguo no sustituye el resultado del commit actual.

[Revisión de UI y estado del cierre](docs/cierre/008-estado.md) ·
[API y Swagger: qué se comprueba](docs/cierre/api-y-swagger.md)

## Ejecutar y estudiar

Las instrucciones de instalación están en [entorno](docs/documentaciondev/entorno.md)
y [operación local](docs/operacion-demo-008.md) y [operación pública](docs/operacion-publica-008.md). Léelas antes de ejecutar una
configuración: los laboratorios y el VPS tienen datos y permisos distintos.

Swagger está habilitado en el entorno local autorizado. En la demo pública sus
rutas se deniegan deliberadamente; no se publica un panel administrador.

## Autoría y forma de trabajo

Proyecto personal de **Juan Carlos Bohórquez Plato — JCBP Software**. Desarrollo
asistido por IA bajo dirección humana: requisitos, decisiones, revisión, pruebas y
aceptación de entregas. No se presenta como producto oficial de ninguna empresa.
El autor está consolidando Java/Spring y aprendiendo Angular; que una función exista
en el proyecto no significa atribuir dominio experto de toda su tecnología.

[Portfolio](https://jcbpsoftware.com) · [Seguridad](SECURITY.md)

La cronología anterior permanece en [trazabilidad](docs/trazabilidad/) y en Git.
El [README anterior](docs/trazabilidad/README-anterior-cierre008.txt) se conserva como
antecedente, no como estado actual. El manual privado de estudio no forma parte de
la demo ni se publica con datos privados en este repositorio.
