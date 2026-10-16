# AG-010 — evidencia backend IA-T03, IA-T04 e IA-T05

Estado observado: verificación local backend superada. Aceptación humana,
integración Compose/Angular, E2E y CI remota se registran por el coordinador.
No se ejecutó Git. No se modificaron V1, ADR-0001/0002 ni evidencias AG anteriores.

## Ejecución final

- Comando desde `backend`: `mvnw.cmd -B spotless:apply verify` sin omitir fases.
- Entorno: Windows, Java 21.0.12.1; wrapper Maven del proyecto; PostgreSQL 17.11
  real con imagen fijada por digest, contenedores desechables y roles separados.
- `JAVA_HOME`: `C:/Program Files/Eclipse Adoptium/jdk-21.0.12.101-hotspot`.
- `MAVEN_USER_HOME`: `tmp/maven-user`; caché Maven `tmp/m2`;
  `TEMP` y `TMP`: `tmp/ag010/backend-temp`, todos dentro del workspace.
- Permiso puntual de herramienta para Docker, Mockito/attach y descargas Maven.
- Evidencia: `backend-verify-05.log`, salida **0**, `BUILD SUCCESS`.
- Resultado: **55 pruebas**, **0 fallos**, **0 errores**, **0 omitidas**.
  Unitarias/MockMvc: 33; integración PostgreSQL/HTTP: 22.
- Spotless check y SpotBugs PASS. No se añadieron exclusiones SpotBugs.
- Dependencias añadidas: starter-security-oauth2-resource-server por BOM Boot
  4.0.8 y bcprov-jdk18on 1.86 exacta; la auditoría corresponde al coordinador.
- `backend-pruebas.json` conserva casos y resultados sin cuerpos ni credenciales.
- `backend-fuentes-sha256.json` fija las fuentes y configuración verificadas.

## Matriz esperado, ejecutado y observado

Todas las filas siguientes se ejecutaron y resultaron PASS en verify-05.
Los nombres de clases de prueba se resuelven en
`backend/src/test/java/es/gestionsolicitudes/identidad/` salvo BaseVerificableIT.

| Criterio | Esperado y casos ejecutados | Implementación principal |
|---|---|---|
| IA-01 | Correo Locale.ROOT, límites, UUID, unicidad, roles múltiples, FK y permisos PostgreSQL: `IdentidadDominioTest.normalizaCorreoConLocaleRootYRechazaEntradasInvalidas`, `IdentidadAccesoIT.usuariosRolesUnicidadRestriccionesYPermisosPostgres` | `Correo`, `UsuarioPublico`, `RepositorioIdentidadJdbc`, V2 |
| IA-02 | 15–128 puntos de código, Unicode, espacios sin recorte, lista común local, Argon2id m=19456/t=2/p=1, sal y verificación: `IdentidadDominioTest.aceptaLimitesUnicodeEspaciosYSinComposicionArbitraria`, `argon2idTieneCosteAprobadoSalAleatoriaYNoRecortaClaves` | `Contrasenas` |
| IA-03 | Local sin variables o con grupos vacíos no crea usuarios; grupos parciales o clave común fallan atómicamente; cuatro roles idempotentes; test/normal no aprovisionan aunque reciban DEMO: seis casos de `PerfilesIdentidadIT` | `AprovisionamientoLocal` |
| IA-04 | Login normaliza correo, emite contrato mínimo, verifica hash ficticio ausente y mismo 401 para ausente/incorrecto/deshabilitado/bloqueado: `ServicioAutenticacionTest.usuarioAusenteYCorreoInvalidoVerificanHashFicticio`, `IdentidadAccesoIT.csrfLoginYoContratoMinimoCookiesYNoCache`, `loginNoEnumeraCuentasIncorrectasDeshabilitadasNiBloqueadas` | `ServicioAutenticacion`, `ControladorAutenticacion` |
| IA-05 | Quinto fallo, ventana/bloqueo de 15 min, límites exactos, no extender bloqueo, éxito restablece y persistencia incluso tras reinicio: `IdentidadDominioTest` casos de intentos, `IdentidadAccesoIT.intentosPersistenVentanaCaducaYUnExitoRestablece`, `PerfilesIdentidadIT.localCreaCuatroRolesIdempotentementeYRefreshSobreviveReinicio` | `IntentosAcceso`, `ServicioAutenticacion`, JDBC |
| IA-06 | RS256/claims mínimos/roles, issuer, audience, fechas, UUID, claims ausentes, firma alterada, algoritmo none/RS512, clave ajena, sesión activa y DB inaccesible: `JwtYClavesTest`; Bearer real ausente/alterado/caducado/usuario deshabilitado: `IdentidadAccesoIT.bearerAusenteAlteradoCaducadoYUsuarioDeshabilitadoSeRechazan` | `EmisorJwt`, `ValidadorJwt`, `ConfiguracionIdentidad` |
| IA-07 | RSA efímera local/test; normal falla sin claves; PKCS8/X509 por PEM y ruta; tamaño, módulos y desafío firma/verificación; pública con mismo módulo/exponente incompatible rechazada; JWT previo al reinicio inválido y refresh válido: `JwtYClavesTest`, `PerfilesIdentidadIT` | `ClavesRsa` |
| IA-08 | Secretos aleatorios de 256 bits, SHA-256 y comparación constante; unidad de rotación/reuse/caducidad/revocación; DB guarda hash de 32 bytes; familia no se amplía; reutilización confirma revocación pese a 401; dos renovaciones esperan realmente el mismo bloqueo de sesión: `IdentidadDominioTest.secretosOpacosAleatoriosSeComparanSinConservarElValor`, `ServicioAutenticacionTest` y `IdentidadAccesoIT` | `SecretosRefresco`, `ServicioAutenticacion`, JDBC/V2 |
| IA-09 | Refresh solo cookie HttpOnly, Secure, Strict, ruta limitada, sin Domain y Max-Age restante; borrado explícito; Secure=false solo local+HTTP+loopback: `CookiesIdentidadTest` y `IdentidadAccesoIT` | `CookiesIdentidad` |
| IA-10 | CSRF materializa cookie legible, cabecera Angular plana; tres POST rechazan ausencia/error incluso con Bearer válido; CORS cerrado conservado: `IdentidadAccesoIT.csrfSeExigeEnCadaPostInclusoConBearerValido`, `ControladorSaludTest.noAbreCorsAUnOrigenAjeno` | `RepositorioCsrfPorEntorno`, `SeguridadTecnica` |
| IA-11 | Logout autentica refresh, acepta antiguo auténtico, revoca sesión/ambos JWT, borra cookie, no-store/Pragma/Clear-Site-Data cache; sin sesión idempotente; carrera refresh/logout termina revocada: `ServicioAutenticacionTest.logoutSoloRevocaConCredencialAutenticaYUsaBloqueoComun`, `IdentidadAccesoIT` casos de logout/carrera | `ServicioAutenticacion`, `ControladorAutenticacion` |
| IA-12 | Identidad pública mínima, Bearer requerido, roles backend, 401/403 por defecto y method security sobre componente exclusivo de prueba: `IdentidadAccesoIT.csrfLoginYoContratoMinimoCookiesYNoCache`, `denegacionPorDefectoYMethodSecurityUsanRolesDeJwt` | `ControladorIdentidad`, `SeguridadTecnica` |
| IA-14 backend | OpenAPI seis rutas y esquema Bearer, normal no publica Swagger; migración inválida V999 sin colisión y rollback; segundo arranque/aislamiento; servidor PostgreSQL conserva ERROR/SQLSTATE sin hash/DETAIL/sentencia ni valor de parámetro: `BaseVerificableIT`, `PerfilesIdentidadIT`, `IdentidadAccesoIT.losErroresSqlDeAplicacionNoIncluyenHashesDeFilas` | `ContratoApi`, V2, application.yaml y configuración PostgreSQL de pruebas |

Desglose final de clases: ServicioAutenticacionTest 7; JwtYClavesTest 7;
IdentidadDominioTest 7; CookiesIdentidadTest 2; ServicioSaludTest 2;
ControladorSaludTest 5; ComprobacionPostgresTest 3; IdentidadAccesoIT 13;
PerfilesIdentidadIT 6; BaseVerificableIT 3.

## Incidencias y correcciones conservadas

1. `backend-compile-01.log`: red DNS bloqueada por sandbox. Descarga puntual
   autorizada y `backend-compile-02.log` PASS, sin relajar dependencias.
2. `backend-unitarias-01.log`: attach de Mockito bloqueado en pipe Windows
   (error 5); ejecución detenida. Los verify posteriores con permiso puntual
   ejecutaron las pruebas reales, sin desactivar Mockito ni tests.
3. `backend-verify-01.log`: 26/27 unitarias PASS; expectativa nueva omitía la
   autoridad técnica `FACTOR_BEARER` añadida por Spring Security 7. Una corrección
   de expectativa; conversión estándar y roles funcionales permanecen intactos.
4. `backend-verify-02.log`: 27 unitarias y 20/21 IT PASS. Alta demo guardaba
   microsegundos mientras login guardaba segundos, pudiendo infringir fechas
   en un login inmediato. Se uniformó el alta a segundos; caso PASS desde 04.
   El diagnóstico PostgreSQL incluía un hash derivado ficticio: se redactó en
   esa evidencia y reportes fallidos. Se añadió protección JDBC y PostgreSQL,
   y una prueba verifica la ausencia real sin imprimir logs ni hashes.
5. `backend-verify-03.log`: 32/33 unitarias PASS; nueva prueba de rotación tenía
   stubbing Mockito anidado. Una corrección separa la lectura del fixture.
6. `backend-verify-04.log`: las 55 pruebas PASS; SpotBugs detectó SecureRandom
   creado para un único uso en desafío de claves. Una corrección usa instancia
   compartida. No se añadió ninguna exclusión al detector.
7. `backend-verify-05.log`: pruebas y controles completos PASS.

R-002-01: se valida el par externo con desafío efímero firmado/verificado,
además de tamaño y módulo; la prueba negativa mismo módulo/exponente 3 PASS.
Ningún defecto requirió dos correcciones fallidas.

Argon2id: cinco muestras locales durante verify-01…05: **22, 22, 23, 23, 22 ms**
por hash medido; parámetros 19456 KiB, 2 iteraciones, paralelismo 1. Última
muestra 22 ms. No es un benchmark ni demuestra equivalencia temporal del login.
La lista común local tiene ocho entradas y está explícita en `Contrasenas`;
no se afirma cobertura de un servicio de contraseñas comprometidas.

## Relevo y pendientes

Variables de clave normal: `IDENTIDAD_CLAVE_PRIVADA_RUTA` y
`IDENTIDAD_CLAVE_PUBLICA_RUTA`, o `IDENTIDAD_CLAVE_PRIVADA_PEM` y
`IDENTIDAD_CLAVE_PUBLICA_PEM`; una fuente por componente. Formatos PKCS8/X509,
RSA mínimo 2048 bits. Local/test generan par efímero; test no crea cuentas.
DEMO usa `DEMO_{ROL}_{CORREO,NOMBRE,CLAVE}` solo en perfil local.

Duraciones predeterminadas: acceso PT10M y familia PT8H; propiedades
`identidad.duracion-acceso` y `identidad.duracion-refresco` positivas, enteras
en segundos y acceso no superior a familia.

Pendiente fuera de estas tareas backend: integración real Compose/E2E conjunta,
revisión independiente final, aceptación humana y CI remota tras push humano.
El coordinador conserva la propiedad de documentación general e infraestructura.
