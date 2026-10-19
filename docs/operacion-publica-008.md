# Operación de la aplicación pública — mapa y precauciones

## No confundir tres lugares

Tu PC contiene el código y Git. GitHub conserva sus versiones y ejecuta pruebas en
máquinas de CI. El VPS IONOS ejecuta las imágenes de la aplicación, aunque el PC
esté apagado. Una imagen es un paquete ejecutable; un contenedor es una instancia
de ese paquete funcionando. Subir código a GitHub no cambia por sí solo el VPS.

La dirección pública es `gestion-empresarial.jcbpsoftware.com`; tu portfolio
`jcbpsoftware.com` sigue siendo independiente. No se trasladan sus DNS ni su correo.

## Componentes públicos

`infraestructura/publica/compose.yaml` describe PostgreSQL, backend, provisionador
y frontend. PostgreSQL guarda control y tres bases de demostración. El backend
aplica las reglas HTTP. El provisionador privado prepara/recicla únicamente los
espacios permitidos. El frontend sirve Angular y actúa como entrada HTTPS/API.
Solo se publican los puertos80/443. SSH22 es para el administrador, no para usuarios.

Los ficheros de `infraestructura/demo/` son del laboratorio; no deben copiarse con
sus secretos al VPS. `infraestructura/publica/operacion/` contiene la instalación,
generación controlada, informe, renovación y respaldo inicial que se utilizaron.
No ejecutes de nuevo el instalador sobre una instalación existente como método de
actualización; conserva versiones y utiliza una actualización identificada.

## Qué sí se acreditó y qué falta

El recibo inicial acredita HTTPS, renovación de prueba y parada/arranque de los
contenedores. La primera copia cifrada se descargó fuera del VPS y se restauró
una base en un destino nuevo QA. Esto no equivale a restaurar el servidor completo.
La política de copias externas periódicas, recuperación global, reinicio del VPS
y ensayo final con PC apagado siguen como cierre operativo explícito.

## Claves y cuentas

`jcbpops` es un administrador del sistema con sudo, no una cuenta de la aplicación.
La frase SSH desbloquea la clave privada en el PC; la privada no se copia al VPS ni
al repositorio. La contraseña del panel IONOS es distinta y no se introduce en los
formularios de la demo. Los usuarios de demo se obtienen reservando un espacio y
eligiendo rol. No existe una contraseña administradora pública para reclutadores.

## Consulta pública sin cambiar datos

Abre `/api/salud` en el subdominio: estado DISPONIBLE y HTTP200 indican que esa
comprobación de disponibilidad responde. No demuestra por sí sola que funcionen
las aprobaciones, permisos o restauraciones: tienen sus propias pruebas.

Swagger y OpenAPI están restringidos en la publicación. Se estudian y prueban en
el laboratorio/CI; recibir404 en sus rutas públicas es intencional. No se abre el
puerto PostgreSQL ni se publica el socket Docker para facilitar una demostración.

## Ante una incidencia

Conserva hora, operación y error sin contraseñas, cookies ni tokens. No uses
`down -v`, `prune`, borrados de bases, cambios de estado manuales o regeneración de
secretos como reparación genérica. Un cambio de imagen o una restauración requiere
versión de origen, copia, destino autorizado y comprobaciones posteriores.

[Estado comprobado](cierre/008-estado.md) · [Guía para visitantes](manual-usuario/recorrido-entrevista.md)
