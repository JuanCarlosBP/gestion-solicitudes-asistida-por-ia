# Auditorías AG-010

## npm

La primera solicitud de npm audit fue rechazada por auto-review: enviar el
inventario de nombres/versiones al registro público exigía autorización específica.
El usuario la concedió expresamente durante AG-010, ampliándola a consultas de
solo lectura de dependencias/vulnerabilidades/documentación oficial, sin código,
archivos, credenciales, tokens, secretos ni datos privados.

Tras esa autorización, `npm audit --omit=dev --json` y `npm audit --json`
terminaron con salida 0 y cero vulnerabilidades de cualquier severidad.
Informes `npm-audit-produccion.json`, `npm-audit-completo.json` y salidas/permiso
en este directorio. No se cambió el lockfile ni se usó audit fix.

Antes de la autorización se preparó además OSV-Scanner 2.7.0 offline con el
volcado público completo npm: 7 componentes de producción y 653 únicos del
conjunto completo, sin coincidencias. Ningún inventario se envió para esa
comprobación. Los SBOM, informes y huella del volcado están en este directorio.
Ese control no se presenta como ejecución de npm audit.

## Maven

Inventario inicial: 132 componentes; OSV offline devolvió 1 con cinco avisos
en `org.bouncycastle:bcprov-jdk18on:1.83`, nueva dependencia para Argon2id:

| Aviso | Severidad publicada | Superficie |
|---|---|---|
| GHSA-574f-3g2m-x479 | Crítica | GOST CTR reutiliza flujo de clave. |
| GHSA-9pwp-9qqc-pr26 | Crítica | Restricciones de nombres de certificados. |
| GHSA-c3fc-8qff-9hwx | Moderada | Ayudante de almacén LDAP. |
| GHSA-p93r-85wp-75v3 | Alta | Canal temporal FrodoKEM. |
| GHSA-qp49-qgx5-5m26 | Alta | Secuencias ASN.1 diferidas y profundidad. |

El código invoca Spring Argon2PasswordEncoder; no usa GOST, FrodoKEM, almacén
LDAP ni validación BC de certificados, y no registra BouncyCastleProvider.
RSA externa se procesa con KeyFactory del JDK. No se considera una prueba
universal de ausencia de alcance: se retira la versión afectada igualmente.

Metadatos oficiales Maven Central consultados muestran 1.86 como release estable.
Plan actualizado antes de cambiar POM. Se fija 1.86, dentro de la línea mayor 1,
y se requieren de nuevo verify y auditoría. La auditoría final con 1.86 terminó
con salida 0, 132 componentes y cero coincidencias; `maven-osv.json`,
`maven.cdx.json` y `maven-auditoria-02.log` conservan el resultado.
La regresión con esa dependencia terminó en `backend-verify-05.log`: verify
íntegro PASS, 55 pruebas, Spotless y SpotBugs sin errores ni omisiones.
Se conservan `maven-osv-01.json`, `maven-01.cdx.json`, inventario y resumen inicial.

## Límites

El escaneo offline usa bases públicas descargadas durante AG-010; sus avisos
pueden cambiar. No cubre vulnerabilidades desconocidas, todo el sistema operativo
de las imágenes ni todos los plugins de construcción. Se conservan fechas y
fuentes, sin sustituir resultados históricos AG-003–AG-009.
