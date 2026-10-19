# ADR-0010 — Configuración pública controlada de 008

**Estado: implementación candidata bajo la autorización humana de desplegar 008.
Pendiente de resultados de ejecución, revisión visual y cierre en GitHub.**
No se presenta como decisión revisada por un agente independiente.

## Problema

El producto 001–007 y la demo 008 tienen comprobaciones locales. Eso no convierte
su Compose de laboratorio ni su estado `restart: "no"` en una instalación pública.
El provisionador rechaza deliberadamente un entorno que no sea local. El usuario
ha autorizado mantener exactamente un VPS, una aplicación y bases independientes,
con datos ficticios, reciclaje seguro y sin administrador público.

## Decisión acotada

1. Conservar íntegramente V1–V7, los contratos de negocio, permisos, autenticación,
   sesiones, reservas, generaciones, drenaje e idempotencia.
2. Ampliar la puerta de autorización del provisionador: `local` conserva su
   comportamiento; `publico` exige una confirmación de configuración exacta.
   Esa confirmación **no es un secreto ni una contraseña ni un permiso del
   navegador**: impide activar accidentalmente el modo público. Los privilegios,
   inventario cerrado y estados siguen siendo las barreras operativas reales.
3. Mantener las restricciones de base autorizada, prefijo `ag016_demo_XX`, misma
   instalación PostgreSQL, ausencia de conexiones/reservas y estados de reciclaje.
   No ampliar destinos arbitrarios ni permitir borrar la base de control.
4. Usar `SPRING_PROFILES_ACTIVE=demo`, sin `local` ni `demo-local`, con secretos
   nuevos del VPS. El proceso HTTP no recibe credenciales administrativas.
5. Nginx publica únicamente 80/443. PostgreSQL, Java y el supervisor no publican
   puertos. HTTP redirige a HTTPS; el certificado usa el subdominio aprobado,
   sin alterar el dominio raíz. Swagger administrativo permanece cerrado.
6. Imágenes construidas en el PC desde el JAR de `verify` y el frontend compilado,
   identificadas por hash y transferidas. No se compila en el VPS pequeño ni se
   descarga un `main` que todavía carece de la implementación local de 008.
7. Mostrar «Demostración · datos ficticios», no «Entorno local» en la cabecera
   de una aplicación accesible por Internet. No se cambia el diseño ni negocio.

## Recursos y límites

Cuotas iniciales: backend 1536 MiB/1,15 CPU; PostgreSQL 768 MiB/0,50 CPU;
supervisor 384 MiB/0,20 CPU; Nginx 128 MiB/0,05 CPU. Suman 2816 MiB y 1,9 CPU.
El VPS dispone de 3858 MiB y dos CPU según la transcripción del operador.
Queda margen para Ubuntu, Docker y herramientas. Estas cuotas **no son idénticas**
a los perfiles A/B históricos: las pruebas de capacidad siguen describiendo la
configuración medida. Esta variante exige comprobaciones en el VPS; no se afirma
que 260 minutos históricos la certifiquen sin contraste.

Las cookies son Secure en el perfil demo público. No se confía en Forwarded ni
X-Forwarded-For del visitante; Nginx aplica límites por IP y Java mantiene sus
límites conservadores. Una sola instancia mantiene un único punto de fallo:
no se anuncia alta disponibilidad. Los logs se acotan por tamaño.

## Recuperación y verificación

La primera publicación no sustituye instalaciones previas. Un marcador impide
repetirla sobre una instalación parcial; los intentos y datos se conservan.
Se comprueban renovación TLS, reinicio de contenedores, aislamiento, tres roles,
CSRF, rutas administrativas cerradas y capturas de 320 a 1920 píxeles.
La primera copia cifrada se descarga fuera del VPS y una base de negocio se
restaura en QA nueva. Eso no es aún restauración global ni una política de copias
periódicas: ambas siguen pendientes antes del cierre final de 008.

## Alternativas no adoptadas

Cambiar `publico` por `local` para evitar la puerta daría una falsa descripción del
entorno. Ejecutar Java por visitante duplicaría procesos sin necesidad. Publicar
puertos de PostgreSQL no ayuda a la demostración. Exponer el Swagger administrador
facilitaría demasiado privilegio. Ninguna de esas alternativas se utiliza.

## Fuentes de implementación

- `backend/.../demo/provision/AutorizacionProvision.java`: puerta de configuración.
- `ProvisionadorDemo.java`: la usa antes de preparar y recrear.
- `infraestructura/publica/`: Compose, Nginx, imágenes y operaciones de servidor.
- `qa/ag016/revision-medicion/`: correcciones del arnés conservadas por versión.
- [Guía de demostración](../manual-usuario/demo-publica.md).
