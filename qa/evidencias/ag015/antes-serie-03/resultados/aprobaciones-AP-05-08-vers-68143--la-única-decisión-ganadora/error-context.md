# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: aprobaciones.spec.ts >> AP-05/08: versión obsoleta y dos pestañas reales conservan la única decisión ganadora
- Location: tmp\ag015\e2e\aprobaciones.spec.ts:485:5

# Error details

```
Test timeout of 120000ms exceeded while running "afterEach" hook.
```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - link "Saltar al contenido" [ref=f1e3] [cursor=pointer]:
    - /url: "#contenido"
  - banner [ref=f1e4]:
    - link "Gestión de Solicitudes, inicio" [ref=f1e5] [cursor=pointer]:
      - /url: /inicio
      - generic [aria-hidden] [ref=f1e6]: GS
      - generic [ref=f1e7]: Gestión de Solicitudes
    - navigation "Navegación principal" [ref=f1e8]:
      - link "Inicio" [ref=f1e9] [cursor=pointer]:
        - /url: /inicio
      - link "Aprobaciones" [ref=f1e10] [cursor=pointer]:
        - /url: /aprobaciones
      - link "Solicitudes" [ref=f1e11] [cursor=pointer]:
        - /url: /solicitudes
      - link "Proveedores" [ref=f1e12] [cursor=pointer]:
        - /url: /proveedores
      - link "Mi cuenta" [ref=f1e13] [cursor=pointer]:
        - /url: /mi-cuenta
    - generic [ref=f1e14]: Entorno local
  - main [ref=f1e15]:
    - region "Operaciones seguras" [ref=f1e17]:
      - article [ref=f1e18]:
        - generic [ref=f1e19]:
          - strong [ref=f1e20]: Aprobación de solicitud
          - status [ref=f1e21]: Operación completada.
        - link "Abrir resultado" [ref=f1e23] [cursor=pointer]:
          - /url: /solicitudes/5d9fc696-c967-4df4-a2cc-6c5e356600dd
      - article [ref=f1e24]:
        - generic [ref=f1e25]:
          - strong [ref=f1e26]: Rechazo de solicitud
          - status [ref=f1e27]: "No se ha localizado un resultado visible para tu cuenta. Conservamos el intento: consulta de nuevo o vuelve al formulario e introduce la misma entrada para reintentarlo."
        - generic [ref=f1e28]:
          - 'button "Consultar resultado: Rechazo de solicitud" [ref=f1e29] [cursor=pointer]': Consultar resultado
          - link "Volver a la operación" [ref=f1e30] [cursor=pointer]:
            - /url: /solicitudes/5d9fc696-c967-4df4-a2cc-6c5e356600dd
    - generic [ref=f1e31]:
      - link "Volver a solicitudes" [ref=f1e32] [cursor=pointer]:
        - /url: /solicitudes
      - status [ref=f1e33]: Solicitud aprobada. La decisión ha quedado registrada.
      - generic [ref=f1e34]:
        - generic [ref=f1e35]:
          - paragraph [ref=f1e36]: SOL-2026-000053
          - heading "Concurrencia E2E 40b122f3-18f9-46e1-9e88-0ff91ccbb618" [active] [level=1] [ref=f1e37]
          - paragraph [ref=f1e38]: Creada por Solicitante de demostración
        - generic [ref=f1e39]: Aprobada
      - generic [ref=f1e40]:
        - generic [ref=f1e41]:
          - region [ref=f1e42]:
            - heading "Datos de la solicitud" [level=2] [ref=f1e43]
            - paragraph [ref=f1e44]: Solicitud ficticia para verificar decisiones con persistencia real.
            - generic [ref=f1e45]:
              - generic [ref=f1e46]:
                - term [ref=f1e47]: Autor
                - definition [ref=f1e48]: Solicitante de demostración
              - generic [ref=f1e49]:
                - term [ref=f1e50]: Supervisor
                - definition [ref=f1e51]: Supervisor de demostración
              - generic [ref=f1e52]:
                - term [ref=f1e53]: Creada
                - definition [ref=f1e54]: 16/10/2026 00:44
              - generic [ref=f1e55]:
                - term [ref=f1e56]: Última actualización
                - definition [ref=f1e57]: 16/10/2026 00:44
              - generic [ref=f1e58]:
                - term [ref=f1e59]: Presentada
                - definition [ref=f1e60]: 16/10/2026 00:44
              - generic [ref=f1e61]:
                - term [ref=f1e62]: Versión
                - definition [ref=f1e63]: "3"
          - region [ref=f1e64]:
            - heading "Proveedor" [level=2] [ref=f1e65]
            - heading "Proveedor aprobaciones 3ed2774d-fa37-4038-b3dd-8b28a72c21b4" [level=3] [ref=f1e66]
            - generic [ref=f1e67]:
              - generic [ref=f1e68]:
                - term [ref=f1e69]: Tipo
                - definition [ref=f1e70]: Profesional
              - generic [ref=f1e71]:
                - term [ref=f1e72]: País fiscal
                - definition [ref=f1e73]: ES
              - generic [ref=f1e74]:
                - term [ref=f1e75]: Identificador fiscal
                - definition [ref=f1e76]: FICTICIO-a06d294a-8bdf-45e0-bf7d-f06267dbd3cd
            - paragraph [ref=f1e77]: Datos del proveedor conservados al presentar la solicitud.
        - complementary "Resumen de importes" [ref=f1e78]:
          - paragraph [ref=f1e79]: Total confirmado
          - strong [ref=f1e80]: 11,32 €
          - paragraph [ref=f1e81]: 2 conceptos · EUR
          - paragraph [ref=f1e82]: Calculado por el servidor, con redondeo por línea a dos decimales.
          - separator [ref=f1e83]
          - paragraph [ref=f1e84]: La cabecera y los conceptos están fijados desde la presentación.
      - region [ref=f1e85]:
        - heading "Conceptos" [level=2] [ref=f1e86]
        - table [ref=f1e87]:
          - caption [ref=f1e88]: Conceptos e importes confirmados por el servidor
          - rowgroup [ref=f1e89]:
            - row [ref=f1e90]:
              - columnheader "Concepto" [ref=f1e91]
              - columnheader "Cantidad" [ref=f1e92]
              - columnheader "Unidad" [ref=f1e93]
              - columnheader "Precio unitario (€)" [ref=f1e94]
              - columnheader "Importe (€)" [ref=f1e95]
          - rowgroup [ref=f1e96]:
            - row [ref=f1e97]:
              - rowheader "1. Servicio ficticio" [ref=f1e98]
              - cell "2.500" [ref=f1e99]
              - cell "Hora" [ref=f1e100]
              - cell "4.1250 €" [ref=f1e101]
              - cell [ref=f1e102]:
                - strong [ref=f1e103]: 10,31 €
            - row [ref=f1e104]:
              - rowheader "2. Material ficticio" [ref=f1e105]
              - cell "3.000" [ref=f1e106]
              - cell "Unidad" [ref=f1e107]
              - cell "0.3350 €" [ref=f1e108]
              - cell [ref=f1e109]:
                - strong [ref=f1e110]: 1,01 €
      - region [ref=f1e111]:
        - paragraph [ref=f1e112]: Decisión registrada
        - heading "Solicitud aprobada" [level=2] [ref=f1e113]
        - generic [ref=f1e114]:
          - generic [ref=f1e115]:
            - term [ref=f1e116]: Supervisor que decidió
            - definition [ref=f1e117]: Supervisor de demostración
          - generic [ref=f1e118]:
            - term [ref=f1e119]: Fecha de decisión
            - definition [ref=f1e120]: 16/10/2026 00:44
        - heading "Comentario de aprobación" [level=3] [ref=f1e121]
        - paragraph [ref=f1e122]: Sin comentario adicional.
      - region [ref=f1e124]:
        - generic [ref=f1e125]:
          - generic [ref=f1e126]:
            - paragraph [ref=f1e127]: TRAZABILIDAD
            - heading "Historial registrado" [level=2] [ref=f1e128]
          - link "Abrir historial completo" [ref=f1e129] [cursor=pointer]:
            - /url: /solicitudes/5d9fc696-c967-4df4-a2cc-6c5e356600dd/historial?page=0&size=20
        - paragraph [ref=f1e130]: Más recientes primero · Fechas mostradas en Europe/Madrid.
        - form "Filtros del historial" [ref=f1e131]:
          - generic [ref=f1e132]:
            - generic [ref=f1e133]:
              - generic [ref=f1e134]: Acción
              - combobox "Acción" [ref=f1e135]:
                - option "Todas" [selected]
                - option "Proveedor creado"
                - option "Proveedor modificado"
                - option "Proveedor desactivado"
                - option "Proveedor reactivado"
                - option "Borrador creado"
                - option "Borrador guardado"
                - option "Solicitud presentada"
                - option "Solicitud aprobada"
                - option "Solicitud rechazada"
            - generic [ref=f1e136]:
              - generic [ref=f1e137]: Actor (UUID)
              - textbox "Actor (UUID)" [ref=f1e138]
            - generic [ref=f1e139]:
              - generic [ref=f1e140]: Desde (ISO con zona)
              - textbox "Desde (ISO con zona)" [ref=f1e141]:
                - /placeholder: 2026-10-15T00:00:00+02:00
            - generic [ref=f1e142]:
              - generic [ref=f1e143]: Hasta (ISO con zona)
              - textbox "Hasta (ISO con zona)" [ref=f1e144]:
                - /placeholder: 2026-10-15T23:59:59+02:00
            - generic [ref=f1e145]:
              - generic [ref=f1e146]: Eventos por página
              - combobox "Eventos por página" [ref=f1e147]:
                - option "1"
                - option "10"
                - option "20" [selected]
                - option "50"
                - option "100"
          - paragraph [ref=f1e148]: Fechas inclusivas. Indica Z para UTC o el desfase, por ejemplo +02:00.
          - generic [ref=f1e149]:
            - button "Aplicar filtros" [ref=f1e150] [cursor=pointer]
            - button "Restablecer filtros" [ref=f1e151] [cursor=pointer]
        - generic [ref=f1e152]:
          - status [ref=f1e153]: 4 eventos encontrados
          - list "Eventos del historial" [ref=f1e154]:
            - listitem [ref=f1e155]:
              - generic [ref=f1e156]:
                - heading "Solicitud aprobada" [level=3] [ref=f1e157]
                - time [ref=f1e158]: 16/10/2026 00:44:07
              - paragraph [ref=f1e159]: Supervisor de demostración
              - paragraph [ref=f1e160]: Solicitud aprobada
              - generic [ref=f1e161]:
                - generic [ref=f1e162]: PRESENTADA → APROBADA
                - generic [ref=f1e163]: Versión 2 → 3
              - paragraph [ref=f1e164]: Decisión registrada
            - listitem [ref=f1e165]:
              - generic [ref=f1e166]:
                - heading "Solicitud presentada" [level=3] [ref=f1e167]
                - time [ref=f1e168]: 16/10/2026 00:44:06
              - paragraph [ref=f1e169]: Solicitante de demostración
              - paragraph [ref=f1e170]: Solicitud presentada
              - generic [ref=f1e171]:
                - generic [ref=f1e172]: BORRADOR → PRESENTADA
                - generic [ref=f1e173]: Versión 1 → 2
              - paragraph [ref=f1e174]: Evento de negocio
            - listitem [ref=f1e175]:
              - generic [ref=f1e176]:
                - heading "Borrador guardado" [level=3] [ref=f1e177]
                - time [ref=f1e178]: 16/10/2026 00:44:06
              - paragraph [ref=f1e179]: Solicitante de demostración
              - paragraph [ref=f1e180]: Borrador guardado
              - generic [ref=f1e181]:
                - generic [ref=f1e182]: BORRADOR → BORRADOR
                - generic [ref=f1e183]: Versión 0 → 1
              - paragraph [ref=f1e184]: Evento de negocio
            - listitem [ref=f1e185]:
              - generic [ref=f1e186]:
                - heading "Borrador creado" [level=3] [ref=f1e187]
                - time [ref=f1e188]: 16/10/2026 00:44:06
              - paragraph [ref=f1e189]: Solicitante de demostración
              - paragraph [ref=f1e190]: Borrador creado
              - generic [ref=f1e191]:
                - generic [ref=f1e192]: Sin estado anterior → BORRADOR
                - generic [ref=f1e193]: Versión — → 0
              - paragraph [ref=f1e194]: Evento de negocio
          - navigation "Paginación del historial" [ref=f1e195]:
            - button "Página anterior de eventos" [disabled] [ref=f1e196]
            - generic [ref=f1e197]: Página 1 de 1
            - button "Siguiente página de eventos" [disabled] [ref=f1e198]
          - paragraph [ref=f1e199]: Si se registran eventos nuevos durante la consulta, las páginas pueden desplazarse. Recarga para actualizar.
          - button "Actualizar historial" [ref=f1e200] [cursor=pointer]
  - contentinfo [ref=f1e201]: Gestión de Solicitudes · Espacio de trabajo
```

# Test source

```ts
  1  | import { test } from '../../frontend/node_modules/@playwright/test/index.js';
  2  | import { writeFileSync } from 'node:fs';
  3  | const registros: Record<string, unknown>[] = [];
  4  | const trabajos: Promise<unknown>[] = [];
  5  | const paginas = new Map();
  6  | let actor: string | undefined;
  7  | let secuencia = 0;
  8  | test.beforeEach(async ({ context }) => {
  9  |   context.on('request', (peticion) => {
  10 |     if (!peticion.url().includes('/api/')) return;
  11 |     const orden = ++secuencia;
  12 |     const pagina = peticion.frame().page();
  13 |     if (!paginas.has(pagina)) paginas.set(pagina, paginas.size + 1);
  14 |     trabajos.push((async () => {
  15 |       const h = await peticion.allHeaders();
  16 |       const cookie = h['cookie']?.split('; ').find(c => c.startsWith('XSRF-TOKEN='))?.slice(11);
  17 |       const token = h['authorization']?.split(' ')[1];
  18 |       const identidad = token ? JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) : null;
  19 |       if (identidad) actor ??= identidad.sub;
  20 |       registros.push({ orden, evento: 'peticion', pagina: paginas.get(pagina), metodo: peticion.method(), ruta: new URL(peticion.url()).pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, ':id'), cookiePresente: !!cookie, cabeceraPresente: !!h['x-xsrf-token'], csrfIguales: !!cookie && decodeURIComponent(cookie) === h['x-xsrf-token'], bearerPresente: !!token, mismoActor: identidad ? identidad.sub === actor : null, roles: identidad?.roles });
  21 |     })());
  22 |   });
  23 |   context.on('response', (respuesta) => {
  24 |     if (!respuesta.url().includes('/api/')) return;
  25 |     const orden = ++secuencia;
  26 |     trabajos.push((async () => {
  27 |       const h = await respuesta.headersArray();
  28 |       const cookies = h.filter(x => x.name.toLowerCase() === 'set-cookie').map(x => x.value.split('=')[0]);
  29 |       let error = null;
  30 |       if (respuesta.status() >= 400) { try { error = (await respuesta.json()).error; } catch {} }
  31 |       registros.push({ orden, evento: 'respuesta', pagina: paginas.get(respuesta.request().frame().page()), ruta: new URL(respuesta.url()).pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, ':id'), estado: respuesta.status(), cookiesEmitidas: cookies, error });
  32 |     })());
  33 |   });
  34 | });
> 35 | test.afterEach(async () => {
     |      ^ Test timeout of 120000ms exceeded while running "afterEach" hook.
  36 |   await Promise.allSettled(trabajos);
  37 |   writeFileSync(process.env['AG015_DIAGNOSTICO']!, JSON.stringify(registros.sort((a,b) => Number(a.orden)-Number(b.orden)), null, 2) + '\n');
  38 | });
  39 | 
```