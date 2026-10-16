# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: aprobaciones.spec.ts >> AP-05/08: versión obsoleta y dos pestañas reales conservan la única decisión ganadora
- Location: tmp\ag015\e2e\aprobaciones.spec.ts:485:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 2
+ Received  + 2

  Array [
-   200,
-   409,
+   403,
+   403,
  ]
```

```
Error: request.allHeaders: Test ended.
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
          - strong [ref=f1e20]: Rechazo de solicitud
          - status [ref=f1e21]: "No se ha localizado un resultado visible para tu cuenta. Conservamos el intento: consulta de nuevo o vuelve al formulario e introduce la misma entrada para reintentarlo."
        - generic [ref=f1e22]:
          - 'button "Consultar resultado: Rechazo de solicitud" [ref=f1e23] [cursor=pointer]': Consultar resultado
          - link "Volver a la operación" [ref=f1e24] [cursor=pointer]:
            - /url: /solicitudes/09f6e862-38c3-4086-b202-d212b1584160
      - article [ref=f1e25]:
        - generic [ref=f1e26]:
          - strong [ref=f1e27]: Aprobación de solicitud
          - status [ref=f1e28]: No se puede consultar o ejecutar con los permisos actuales. El resultado no se muestra.
        - generic [ref=f1e29]:
          - 'button "Consultar resultado: Aprobación de solicitud" [ref=f1e30] [cursor=pointer]': Consultar resultado
          - link "Volver a la operación" [ref=f1e31] [cursor=pointer]:
            - /url: /solicitudes/09f6e862-38c3-4086-b202-d212b1584160
    - generic [ref=f1e32]:
      - link "Volver a solicitudes" [ref=f1e33] [cursor=pointer]:
        - /url: /solicitudes
      - generic [ref=f1e34]:
        - generic [ref=f1e35]:
          - paragraph [ref=f1e36]: SOL-2026-000056
          - heading "Concurrencia E2E a7b5e50d-5ae8-4063-921f-d6dd3bdf8bbc" [level=1] [ref=f1e37]
          - paragraph [ref=f1e38]: Creada por Solicitante de demostración
        - generic [ref=f1e39]: Presentada
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
                - definition [ref=f1e54]: 16/10/2026 00:47
              - generic [ref=f1e55]:
                - term [ref=f1e56]: Última actualización
                - definition [ref=f1e57]: 16/10/2026 00:47
              - generic [ref=f1e58]:
                - term [ref=f1e59]: Presentada
                - definition [ref=f1e60]: 16/10/2026 00:47
              - generic [ref=f1e61]:
                - term [ref=f1e62]: Versión
                - definition [ref=f1e63]: "2"
          - region [ref=f1e64]:
            - heading "Proveedor" [level=2] [ref=f1e65]
            - heading "Proveedor aprobaciones 1e7c6548-20df-4ce6-9e66-2cba6797f616" [level=3] [ref=f1e66]
            - generic [ref=f1e67]:
              - generic [ref=f1e68]:
                - term [ref=f1e69]: Tipo
                - definition [ref=f1e70]: Profesional
              - generic [ref=f1e71]:
                - term [ref=f1e72]: País fiscal
                - definition [ref=f1e73]: ES
              - generic [ref=f1e74]:
                - term [ref=f1e75]: Identificador fiscal
                - definition [ref=f1e76]: FICTICIO-c6eecd7e-dd6b-452d-b3fa-01c2e3fb37c4
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
      - region [ref=f1e112]:
        - paragraph [ref=f1e113]: Supervisión asignada
        - heading "Decidir esta solicitud" [level=2] [ref=f1e114]
        - paragraph [ref=f1e115]: La aprobación o el rechazo son definitivos. Revisa los conceptos y el total antes de decidir.
        - alert [active] [ref=f1e116]:
          - paragraph [ref=f1e117]: Tu cuenta no tiene permiso para esta operación.
          - button "Recargar estado actual" [ref=f1e119] [cursor=pointer]
        - generic [ref=f1e120]:
          - button "Aprobar solicitud" [ref=f1e121] [cursor=pointer]
          - button "Rechazar solicitud" [ref=f1e122] [cursor=pointer]
        - form "Decisión del supervisor" [ref=f1e123]:
          - generic [ref=f1e124]:
            - generic [ref=f1e125]: Comentario de aprobación (opcional)
            - textbox "Comentario de aprobación (opcional)" [ref=f1e126]
            - generic [ref=f1e127]: Hasta 500 caracteres. Será visible para las personas autorizadas a consultar la solicitud.
          - button "Revisar decisión" [ref=f1e128] [cursor=pointer]
      - region [ref=f1e130]:
        - generic [ref=f1e131]:
          - generic [ref=f1e132]:
            - paragraph [ref=f1e133]: TRAZABILIDAD
            - heading "Historial registrado" [level=2] [ref=f1e134]
          - link "Abrir historial completo" [ref=f1e135] [cursor=pointer]:
            - /url: /solicitudes/09f6e862-38c3-4086-b202-d212b1584160/historial?page=0&size=20
        - paragraph [ref=f1e136]: Más recientes primero · Fechas mostradas en Europe/Madrid.
        - form "Filtros del historial" [ref=f1e137]:
          - generic [ref=f1e138]:
            - generic [ref=f1e139]:
              - generic [ref=f1e140]: Acción
              - combobox "Acción" [ref=f1e141]:
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
            - generic [ref=f1e142]:
              - generic [ref=f1e143]: Actor (UUID)
              - textbox "Actor (UUID)" [ref=f1e144]
            - generic [ref=f1e145]:
              - generic [ref=f1e146]: Desde (ISO con zona)
              - textbox "Desde (ISO con zona)" [ref=f1e147]:
                - /placeholder: 2026-10-15T00:00:00+02:00
            - generic [ref=f1e148]:
              - generic [ref=f1e149]: Hasta (ISO con zona)
              - textbox "Hasta (ISO con zona)" [ref=f1e150]:
                - /placeholder: 2026-10-15T23:59:59+02:00
            - generic [ref=f1e151]:
              - generic [ref=f1e152]: Eventos por página
              - combobox "Eventos por página" [ref=f1e153]:
                - option "1"
                - option "10"
                - option "20" [selected]
                - option "50"
                - option "100"
          - paragraph [ref=f1e154]: Fechas inclusivas. Indica Z para UTC o el desfase, por ejemplo +02:00.
          - generic [ref=f1e155]:
            - button "Aplicar filtros" [ref=f1e156] [cursor=pointer]
            - button "Restablecer filtros" [ref=f1e157] [cursor=pointer]
        - generic [ref=f1e158]:
          - status [ref=f1e159]: 3 eventos encontrados
          - list "Eventos del historial" [ref=f1e160]:
            - listitem [ref=f1e161]:
              - generic [ref=f1e162]:
                - heading "Solicitud presentada" [level=3] [ref=f1e163]
                - time [ref=f1e164]: 16/10/2026 00:47:32
              - paragraph [ref=f1e165]: Solicitante de demostración
              - paragraph [ref=f1e166]: Solicitud presentada
              - generic [ref=f1e167]:
                - generic [ref=f1e168]: BORRADOR → PRESENTADA
                - generic [ref=f1e169]: Versión 1 → 2
              - paragraph [ref=f1e170]: Evento de negocio
            - listitem [ref=f1e171]:
              - generic [ref=f1e172]:
                - heading "Borrador guardado" [level=3] [ref=f1e173]
                - time [ref=f1e174]: 16/10/2026 00:47:32
              - paragraph [ref=f1e175]: Solicitante de demostración
              - paragraph [ref=f1e176]: Borrador guardado
              - generic [ref=f1e177]:
                - generic [ref=f1e178]: BORRADOR → BORRADOR
                - generic [ref=f1e179]: Versión 0 → 1
              - paragraph [ref=f1e180]: Evento de negocio
            - listitem [ref=f1e181]:
              - generic [ref=f1e182]:
                - heading "Borrador creado" [level=3] [ref=f1e183]
                - time [ref=f1e184]: 16/10/2026 00:47:32
              - paragraph [ref=f1e185]: Solicitante de demostración
              - paragraph [ref=f1e186]: Borrador creado
              - generic [ref=f1e187]:
                - generic [ref=f1e188]: Sin estado anterior → BORRADOR
                - generic [ref=f1e189]: Versión — → 0
              - paragraph [ref=f1e190]: Evento de negocio
          - navigation "Paginación del historial" [ref=f1e191]:
            - button "Página anterior de eventos" [disabled] [ref=f1e192]
            - generic [ref=f1e193]: Página 1 de 1
            - button "Siguiente página de eventos" [disabled] [ref=f1e194]
          - paragraph [ref=f1e195]: Si se registran eventos nuevos durante la consulta, las páginas pueden desplazarse. Recarga para actualizar.
          - button "Actualizar historial" [ref=f1e196] [cursor=pointer]
  - contentinfo [ref=f1e197]: Gestión de Solicitudes · Espacio de trabajo
```

# Test source

```ts
  1  | import { test } from '../../frontend/node_modules/@playwright/test/index.js';
  2  | import { writeFileSync } from 'node:fs';
  3  | const registros: Record<string, unknown>[] = [];
  4  | const trabajos: Promise<unknown>[] = [];
  5  | function guardar() {
  6  |   writeFileSync(process.env['AG015_DIAGNOSTICO']!, JSON.stringify(registros.sort((a,b) => Number(a.orden)-Number(b.orden)), null, 2) + '\n');
  7  | }
  8  | const paginas = new Map();
  9  | let actor: string | undefined;
  10 | let secuencia = 0;
  11 | test.beforeEach(async ({ context }) => {
  12 |   context.on('request', (peticion) => {
  13 |     if (!peticion.url().includes('/api/')) return;
  14 |     const orden = ++secuencia;
  15 |     const pagina = peticion.frame().page();
  16 |     if (!paginas.has(pagina)) paginas.set(pagina, paginas.size + 1);
  17 |     trabajos.push((async () => {
> 18 |       const h = await peticion.allHeaders();
     |                                ^ Error: request.allHeaders: Test ended.
  19 |       const cookie = h['cookie']?.split('; ').find(c => c.startsWith('XSRF-TOKEN='))?.slice(11);
  20 |       const token = h['authorization']?.split(' ')[1];
  21 |       const identidad = token ? JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) : null;
  22 |       if (identidad) actor ??= identidad.sub;
  23 |       registros.push({ orden, evento: 'peticion', pagina: paginas.get(pagina), metodo: peticion.method(), ruta: new URL(peticion.url()).pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, ':id'), cookiePresente: !!cookie, cabeceraPresente: !!h['x-xsrf-token'], csrfIguales: !!cookie && decodeURIComponent(cookie) === h['x-xsrf-token'], bearerPresente: !!token, mismoActor: identidad ? identidad.sub === actor : null, roles: identidad?.roles });
  24 |       guardar();
  25 |     })());
  26 |   });
  27 |   context.on('response', (respuesta) => {
  28 |     if (!respuesta.url().includes('/api/')) return;
  29 |     const orden = ++secuencia;
  30 |     trabajos.push((async () => {
  31 |       const h = await respuesta.headersArray();
  32 |       const cookies = h.filter(x => x.name.toLowerCase() === 'set-cookie').map(x => x.value.split('=')[0]);
  33 |       let error = null;
  34 |       if (respuesta.status() >= 400) { try { error = (await respuesta.json()).error; } catch {} }
  35 |       registros.push({ orden, evento: 'respuesta', pagina: paginas.get(respuesta.request().frame().page()), ruta: new URL(respuesta.url()).pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, ':id'), estado: respuesta.status(), cookiesEmitidas: cookies, error });
  36 |       guardar();
  37 |     })());
  38 |   });
  39 | });
  40 | test.afterEach(async () => {
  41 |   guardar();
  42 | });
  43 | 
```