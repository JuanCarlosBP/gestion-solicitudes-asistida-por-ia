# Política de seguridad — Gestión de Solicitudes

**Versión:** 1.0
**Estado:** Aprobada

Esta política define las reglas de seguridad que deberá cumplir el sistema.

Estas reglas se aplicarán al diseño, al código, a las pruebas, a la configuración
y al despliegue.

## 1. Principios generales

- El backend tendrá siempre la última palabra sobre quién puede entrar,
  qué puede hacer y qué datos son válidos.
- Si una acción no está permitida de forma clara, se rechazará.
- Cada usuario, proceso, base de datos, contenedor o servicio tendrá solo
  los permisos que realmente necesite.
- Todo dato que llegue desde fuera se considerará no fiable hasta comprobarlo.
- La seguridad se diseñará al mismo tiempo que cada funcionalidad, no al final.
- No se quitará ni reducirá una medida de seguridad solo para solucionar
  más rápido un problema técnico.

## 2. Autenticación y acceso

- Toda operación protegida exigirá que el usuario esté correctamente identificado.
- Las credenciales se comprobarán siempre en el backend.
- Se utilizará Spring Security y componentes mantenidos; no se inventarán
  mecanismos criptográficos propios.
- Un error de acceso no dirá si el usuario existe, está bloqueado o ha escrito
  mal la contraseña.
- Se limitarán los intentos repetidos de acceso, evitando a la vez bloqueos
  permanentes que puedan usarse para perjudicar a otra persona.
- El acceso tendrá reglas claras de caducidad, renovación, cierre de sesión
  y revocación.
- Antes de implementarlo se documentará cómo funcionarán las sesiones o tokens.

## 3. Contraseñas

- Las contraseñas nunca se guardarán tal como las escribe el usuario.
- Tampoco se guardarán mediante un cifrado que permita recuperarlas.
- Se usará una función diseñada específicamente para almacenar contraseñas,
  mediante una biblioteca mantenida.
- Cada contraseña tendrá una sal aleatoria propia, es decir, un valor diferente
  que ayuda a proteger su almacenamiento.
- No se usarán directamente hashes rápidos como SHA-256 para guardar contraseñas.
- Mientras la contraseña sea el único factor de autenticación, se exigirán
  al menos 15 caracteres.
- Se admitirán al menos 64 caracteres y la contraseña no se recortará
  silenciosamente.
- Se permitirán contraseñas largas, espacios y gestores de contraseñas.
- No se obligará a usar combinaciones arbitrarias ni a cambiar la contraseña
  cada cierto tiempo sin una razón de seguridad.
- Se rechazarán contraseñas conocidas como demasiado comunes o comprometidas.
- Las contraseñas y sus valores derivados no aparecerán en logs, respuestas
  ni documentación pública.

## 4. Permisos y autorización

- Haber iniciado sesión no dará permiso para hacer cualquier cosa.
- El backend comprobará cada acción y cada recurso antes de permitirla.
- Cuando sea necesario se comprobarán el rol, el usuario, el propietario,
  el estado del recurso y los campos que se intentan modificar.
- El backend no confiará en roles, estados, propietarios, permisos o IDs
  enviados por Angular.
- Ocultar un botón o una ruta en Angular mejora la interfaz, pero no protege
  realmente una operación.
- Si alguien llama directamente a la API deberá pasar exactamente los mismos
  controles.
- Ni siquiera un administrador podrá saltarse las reglas de negocio
  simplemente por ser administrador.

## 5. Datos recibidos y contratos

- El backend comprobará el tipo de dato, campos obligatorios, longitud,
  formato, rango, relaciones y estados permitidos.
- Angular también podrá validar datos para ayudar al usuario, pero esa
  validación nunca sustituirá la del backend.
- Cada petición solo podrá modificar los campos que realmente estén permitidos.
- Campos internos como propietario, rol, aprobador, auditoría, versión o
  determinados estados no podrán cambiarse libremente desde el cliente.
- Las peticiones, búsquedas, listados, filtros y paginación tendrán límites.
- Los errores de validación serán claros para el usuario sin mostrar información
  interna del sistema.

## 6. Inyección y contenido peligroso

- Las consultas SQL usarán parámetros separados de los datos del usuario.
  No se construirá SQL pegando directamente esos datos dentro de la consulta.
- Los valores que no puedan enviarse como parámetros se elegirán de una lista
  cerrada de opciones permitidas.
- Lo que escriba un usuario se tratará como información, nunca como código
  que deba ejecutarse.
- No se desactivarán las protecciones de Angular frente a contenido peligroso
  salvo que exista una razón aprobada, revisada y probada.
- Los datos externos no se usarán directamente para construir comandos,
  rutas internas o consultas ejecutables.

## 7. Navegador y API

- Una operación que cambie datos no utilizará un método HTTP pensado solo
  para consultar información.
- Se usará protección CSRF cuando el navegador envíe automáticamente las
  credenciales del usuario.
- CORS permitirá únicamente las páginas, métodos y cabeceras que realmente
  necesite la aplicación.
- CORS no sustituirá nunca la autenticación ni los permisos.
- La información privada no podrá quedar en una caché compartida y terminar
  mostrándose a otro usuario.
- Toda la aplicación pública funcionará mediante HTTPS.
- Se utilizarán cabeceras HTTP de seguridad adecuadas para limitar contenido
  ejecutable, reforzar HTTPS y evitar usos no previstos del navegador.
- Su configuración concreta se decidirá y probará con la arquitectura real.
- Al cerrar sesión se eliminarán las credenciales temporales del navegador,
  según el mecanismo de autenticación aprobado.

## 8. Secretos y configuración

- Contraseñas, claves privadas, tokens, credenciales de PostgreSQL y API keys
  no se escribirán dentro del código.
- Tampoco aparecerán en Git, documentación, frontend, imágenes Docker,
  prompts publicados ni logs.
- Los secretos se entregarán a la aplicación mediante mecanismos seguros
  del entorno donde se ejecute.
- Los ejemplos usarán siempre valores falsos.
- Los distintos entornos utilizarán secretos separados cuando sea necesario.
- Si un secreto se filtra, habrá que invalidarlo y sustituirlo. Borrarlo
  del último archivo no solucionará por sí solo el problema.
- Los entornos públicos no mostrarán información de depuración, stack traces,
  consolas ni diagnósticos internos que no sean necesarios.

## 9. Comunicaciones y criptografía

- La aplicación pública utilizará HTTPS con una configuración segura y vigente.
- No se crearán algoritmos criptográficos propios.
- Las claves criptográficas estarán fuera del código y tendrán solo los
  permisos necesarios.
- Firmar información y cifrarla son cosas distintas; una firma no se tratará
  como si ocultara los datos.
- Los tokens o credenciales enviados al navegador no contendrán información
  sensible que no sea necesaria.

## 10. Integridad, importes y reglas de negocio

- Las reglas importantes se comprobarán siempre en el servidor.
- Una solicitud solo podrá pasar de un estado a otro cuando ese cambio esté
  permitido.
- Nadie podrá aprobar su propia solicitud.
- Los importes y totales importantes serán calculados o comprobados
  por el servidor.
- El usuario no podrá cambiar información controlada por el servidor enviando
  datos manipulados desde Angular o directamente a la API.
- Las operaciones relacionadas deberán mantener siempre los datos en un estado
  válido según las reglas del negocio.
- Si una operación falla, el sistema no deberá comportarse como si hubiera
  terminado correctamente.

## 11. Transacciones, concurrencia e idempotencia

- Si varios cambios forman parte de una misma operación, se tratarán como
  una sola unidad cuando sea necesario.
- Si esa operación falla, deberá completarse entera o deshacerse, evitando
  dejar datos a medias.
- Dos usuarios modificando lo mismo al mismo tiempo no podrán sobrescribir
  silenciosamente el trabajo más reciente.
- Se controlarán los conflictos entre editar, eliminar, presentar, aprobar
  y rechazar una solicitud.
- Si una operación se repite por error, se evitará producir dos veces el mismo
  efecto cuando solo deba producirse una vez.
- La solución concreta para versiones, bloqueos o idempotencia se decidirá
  en el diseño técnico de cada funcionalidad.

## 12. Errores, logs y auditoría

- Los errores enviados al cliente tendrán una forma clara y controlada.
- No mostrarán stack traces, consultas SQL, rutas internas, configuraciones
  ni secretos.
- Si el sistema no puede comprobar una medida de seguridad, rechazará
  la operación en lugar de permitirla.
- Se distinguirán los logs técnicos, los eventos de seguridad y el historial
  de las acciones del negocio.
- Los registros no contendrán contraseñas, hashes de contraseñas, tokens,
  claves ni secretos.
- En las operaciones importantes deberá poder saberse, cuando corresponda,
  quién actuó, cuándo, qué hizo, sobre qué recurso y qué resultado tuvo.
- Los usuarios normales no podrán modificar libremente el historial
  de auditoría.
- Los eventos de seguridad importantes deberán poder localizarse y revisarse.
- Los logs y los datos tendrán plazos definidos de conservación y borrado,
  acordes con su finalidad y con las obligaciones aplicables.

## 13. Infraestructura, Docker y PostgreSQL

- La aplicación, PostgreSQL y los procesos relacionados tendrán solo los
  permisos que realmente necesiten.
- El usuario de PostgreSQL usado por la aplicación no tendrá permisos
  administrativos innecesarios.
- PostgreSQL no estará abierto directamente a Internet salvo que exista
  una necesidad clara y justificada.
- Solo se expondrán los puertos y servicios necesarios.
- Los contenedores evitarán ejecutarse como `root`, usar modo privilegiado
  o acceder al socket de Docker salvo que sea imprescindible.
- Las imágenes Docker no incluirán secretos y partirán de imágenes base
  mantenidas y de origen conocido.
- Las imágenes que vayan a publicarse se revisarán antes del despliegue.

## 14. Dependencias y cadena de suministro

- Solo se añadirán librerías y herramientas que sean necesarias, estén
  mantenidas y tengan un origen identificable.
- Se revisarán tanto las dependencias que añadamos directamente como las que
  lleguen a través de otras dependencias, además de imágenes, acciones de CI,
  herramientas, MCP y skills externos.
- Las versiones usadas deberán quedar fijadas de forma que el proyecto pueda
  volver a construirse de manera reproducible.
- Una actualización automática podrá proponerse, pero no entrará al proyecto
  sin pasar las comprobaciones necesarias.
- Cada versión entregada deberá poder relacionarse con el código exacto
  del que salió y con los artefactos generados.

## 15. Disponibilidad, abuso y entorno público

- Las funciones que puedan utilizarse de forma abusiva tendrán límites.
- Se vigilarán especialmente el login, la renovación de credenciales,
  las búsquedas, los listados y las operaciones costosas.
- La demo pública utilizará únicamente datos falsos y cuentas con permisos
  limitados.
- No se expondrán públicamente funciones administrativas, diagnósticos ni
  mecanismos para reiniciar todo el sistema.
- Swagger y OpenAPI seguirán respetando los mismos controles de autenticación
  y permisos que el resto de la API.
- Los mecanismos para recuperar o reconstruir el sistema no formarán parte
  del CRUD público.
- La recuperación o reconstrucción deberá probarse antes de decir que funciona.

## 16. Verificación de seguridad

- Cada medida importante de seguridad deberá tener una prueba o evidencia.
- Se probarán casos correctos, casos incorrectos y valores límite según
  el riesgo.
- Si una prueba demuestra que el sistema rechaza correctamente una acción
  prohibida, esa prueba se considera superada.
- Una medida que todavía no se haya probado seguirá marcada como pendiente.
- El proyecto se revisará frente a OWASP Top 10:2025 y los controles de
  OWASP ASVS 5.0 que realmente sean aplicables.
- No se afirmará que el proyecto cumple completamente un estándar si no
  se han revisado y probado todos los requisitos que correspondan.

## 17. Cambios y excepciones

Cualquier excepción a estas reglas deberá quedar escrita, explicada,
evaluada, aprobada y registrada.

Si cambia una regla de seguridad, primero se actualizará la documentación
y después el código o la configuración afectados.

---

Tener esta política escrita no demuestra por sí solo que la aplicación sea segura.

La seguridad tendrá que demostrarse con implementación, revisiones,
pruebas y evidencias de la versión concreta.

## Aplicación a las decisiones de solicitudes — AG-012

005 concreta estas reglas sin excepciones: solo decide el supervisor asignado,
habilitado y con rol vigente, nunca el autor. Ser administrador o combinar roles
no elude esa condición. El backend revalida la autorización antes de devolver un
resultado idempotente y mantiene CSRF, DTO cerrado, versión y estados finales.

La decisión, su evento mínimo y el resultado idempotente se guardan atómicamente.
El usuario de aplicación solo puede consultar e insertar eventos, no alterarlos
ni borrarlos. Los textos son visibles únicamente mediante el detalle autorizado;
los logs técnicos omiten comentarios, motivos, cuerpos, tokens y claves reutilizables.
Las pruebas ejecutadas y sus límites se registran en
[validación 005](../especificaciones/005-aprobaciones/validacion.md). La existencia
de este apartado no acredita por sí sola un control superado.

## Aplicación transversal006 — AG-013

La autorización se revalida en PostgreSQL antes de replay y recuperación; una
clave conocida o roles antiguos del JWT no conceden permiso. Las siete POST
mantienen CSRF. Éxito/efecto/evento atómicos; errores no memorizados. Espera acotada
de3s, sin mantener conexiones para duplicados locales. El cliente solo persiste
descriptor mínimo24h; ninguna credencial ni cuerpo. La retención del servidor
no tiene purga automática por D00607; plazo jurídico/archivo pendientes007/008.
Requisitos y comprobaciones en [006](../especificaciones/006-concurrencia-idempotencia/validacion.md),
sin afirmar cobertura integral de seguridad ni rendimiento productivo.
