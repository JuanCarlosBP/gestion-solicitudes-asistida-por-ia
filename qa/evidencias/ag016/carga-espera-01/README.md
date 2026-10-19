# AG-016 — Espera hasta el plazo y congelado previo a A1

El coordinador autorizó el ajuste mínimo de `hasta(instante)` para respetar
los 65 minutos completos aunque un temporizador retorne antes de su plazo.
La función vuelve a consultar `performance.now()` después de cada espera y
espera el tiempo restante mientras sea positivo. No cambia las ventanas,
los desfases, las operaciones ni los límites del tráfico.

Comprobación offline ejecutada el 16/10/2026, 14:06:44–14:06:52 Europe/Madrid,
Windows y Node v24.13.0. `validar.mjs` extrae la función real del arnés e inyecta
un reloj y temporizador deterministas, sin importar el módulo ni abrir red.

- Antes: 3 PASS / 2 FAIL. El caso de retorno anticipado terminaba en 999,5 ms
  para un objetivo de 1000 ms; conserva `antes.json` y la huella anterior.
- Después: 5/5 PASS. Comprueba uno y dos retornos anticipados, llegada exacta,
  plazo alcanzado y plazo pasado. Resultado completo en `despues.json`.
- `node --check qa/ag016/carga.mjs`: código 0, PASS.

Nueva huella SHA-256 de `qa/ag016/carga.mjs`:
`b11ee4085f3aecc32af50ee48fef0c2ff9608e9ff3987e8a9cdc857162cd373c`.

`congelado.json` identifica el arnés y contrato tras esta corrección.
`recorrido.mjs` y `contrato-carga.json` no cambian; el contrato no contiene
una huella de carga que actualizar. Las evidencias anteriores se conservan.
No se ejecutó build de producto, Docker, Git ni una pasada de carga en esta
comprobación. La ejecución y verificación de A1 quedan a cargo del coordinador.
