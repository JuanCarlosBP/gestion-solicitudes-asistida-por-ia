# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: proveedores.spec.ts >> PR-10: doce pasos de proveedores con Angular, API y PostgreSQL reales
- Location: e2e\proveedores.spec.ts:39:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('link', { name: 'E2E cae4f512-4153-4906-8256-e03bc4632a3b A', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('link', { name: 'E2E cae4f512-4153-4906-8256-e03bc4632a3b A', exact: true }) with timeout 5000ms
  - waiting for getByRole('link', { name: 'E2E cae4f512-4153-4906-8256-e03bc4632a3b A', exact: true })

```

```yaml
- link "Saltar al contenido":
  - /url: "#contenido"
- banner:
  - link "Gestión de Solicitudes, inicio":
    - /url: /inicio
    - text: Gestión de Solicitudes
  - navigation "Navegación principal":
    - link "Inicio":
      - /url: /inicio
    - link "Solicitudes":
      - /url: /solicitudes
    - link "Proveedores":
      - /url: /proveedores
    - link "Historial":
      - /url: /historial
    - link "Mi cuenta":
      - /url: /mi-cuenta
  - text: Entorno local
- main:
  - region "Operaciones seguras":
    - article:
      - strong: Alta de proveedor
      - status: Operación completada.
      - link "Abrir resultado":
        - /url: /proveedores/65b076eb-0188-49e6-af2b-b160dd89b99b
  - region "Proveedores":
    - paragraph: Catálogo
    - heading "Proveedores" [level=1]
    - link "Nuevo proveedor":
      - /url: /proveedores/nuevo?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&sort=denominacion,asc&size=20&page=0
    - form "Filtros de proveedores":
      - group "Buscar en el catálogo":
        - text: Denominación contiene
        - textbox "Denominación contiene"
        - text: Identificador fiscal exacto
        - textbox "Identificador fiscal exacto"
        - text: Tipo
        - combobox "Tipo":
          - option "Todos los tipos" [selected]
          - option "Persona jurídica"
          - option "Profesional"
        - text: País fiscal (ISO, dos letras)
        - textbox "País fiscal (ISO, dos letras)":
          - /placeholder: ES
        - text: Estado
        - combobox "Estado":
          - option "Activos" [selected]
          - option "Inactivos"
          - option "Todos los estados"
        - text: Orden
        - combobox "Orden":
          - 'option "Denominación: A–Z" [selected]'
          - 'option "Denominación: Z–A"'
          - 'option "Creación: más recientes"'
          - 'option "Creación: más antiguos"'
          - 'option "Actualización: más recientes"'
          - 'option "Actualización: más antiguos"'
        - text: Resultados por página (1–100)
        - spinbutton "Resultados por página (1–100)": "20"
        - button "Buscar"
        - button "Restablecer filtros"
    - status: 149 proveedores encontrados.
    - list:
      - listitem:
        - link "AG011 mv7cq6v7 A concurrente":
          - /url: /proveedores/2b0beb28-b57b-4597-a909-49e1531d96c3?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · FICTICIO-mv7cq6v7
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "AG011 mv7cq6v7 B 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀":
          - /url: /proveedores/3cf66d0a-4f59-43e9-9c51-ad4058210d3e?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀mv7cq6v7
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "AG011 mv7cuhb4 A concurrente":
          - /url: /proveedores/6ae6aa6f-2cc0-4aea-b775-ba27033c471c?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · FICTICIO-mv7cuhb4
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "AG011 mv7cuhb4 B 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀":
          - /url: /proveedores/105aa580-49a5-48fc-a51c-e5ce999a8409?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀mv7cuhb4
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "AG011 mv8mqcox A concurrente":
          - /url: /proveedores/37d99cbb-7ef9-4d7f-a02a-ccf21f6106fc?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · FICTICIO-mv8mqcox
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "AG011 mv8mqcox B 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀":
          - /url: /proveedores/94a1dc05-febf-4119-8333-f7df783ecd8d?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀mv8mqcox
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "E2E 1a5dd289-ac99-41c1-999c-ec31e6b76eff A concurrente":
          - /url: /proveedores/580bad47-9813-4cda-a831-90e6d6823ace?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · FICTICIO-1a5dd289-ac99-41c1-999c-ec31e6b76eff
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "E2E 1a5dd289-ac99-41c1-999c-ec31e6b76eff B 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀":
          - /url: /proveedores/0a19d25a-0949-4ffd-8c3e-0738dca6dd9e?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀1a5dd289-ac99-41c1-999c-ec31e6b76eff
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "E2E 305a1805-83bd-40a3-8cd5-540dbc4ef17c A concurrente":
          - /url: /proveedores/96ca4e2a-fac6-4fe2-ac8b-2c44059db41c?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · FICTICIO-305a1805-83bd-40a3-8cd5-540dbc4ef17c
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "E2E 305a1805-83bd-40a3-8cd5-540dbc4ef17c B 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀":
          - /url: /proveedores/29e68a9d-5ef9-4dce-b098-b0a1f9a1f8f9?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀305a1805-83bd-40a3-8cd5-540dbc4ef17c
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "E2E 440f8063-3ee1-4758-a74e-0f4bab25d643 A concurrente":
          - /url: /proveedores/54007ff9-916d-4a25-a868-0b8c91286b5d?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · FICTICIO-440f8063-3ee1-4758-a74e-0f4bab25d643
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "E2E 440f8063-3ee1-4758-a74e-0f4bab25d643 B 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀":
          - /url: /proveedores/d9624d59-49b3-4127-a6a1-ff28c03b7532?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀440f8063-3ee1-4758-a74e-0f4bab25d643
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "E2E 4fe35527-9e00-4580-bd5f-9837e6fe51ee A concurrente":
          - /url: /proveedores/582028de-efcc-4b45-a55c-2825cf01b2ca?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · FICTICIO-4fe35527-9e00-4580-bd5f-9837e6fe51ee
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "E2E 4fe35527-9e00-4580-bd5f-9837e6fe51ee B 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀":
          - /url: /proveedores/72ae4a54-8ea0-4e23-9910-c04666700fea?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀4fe35527-9e00-4580-bd5f-9837e6fe51ee
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "E2E 5c768fb7-6a52-4827-9a9b-6363340430eb A concurrente":
          - /url: /proveedores/511accfd-d1b6-4ac4-9e09-2126063f042d?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · FICTICIO-5c768fb7-6a52-4827-9a9b-6363340430eb
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "E2E 5c768fb7-6a52-4827-9a9b-6363340430eb B 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀":
          - /url: /proveedores/f5a82199-6284-4b94-adf3-07276f5f26b5?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀5c768fb7-6a52-4827-9a9b-6363340430eb
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "E2E 664bad80-07ba-461e-ba39-95e29da5af84 A concurrente":
          - /url: /proveedores/5cc21f3d-0846-4bc6-8571-23bb4d40934a?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · FICTICIO-664bad80-07ba-461e-ba39-95e29da5af84
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "E2E 664bad80-07ba-461e-ba39-95e29da5af84 B 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀":
          - /url: /proveedores/a28ec6de-f81f-4349-ac90-eed79a77619d?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀664bad80-07ba-461e-ba39-95e29da5af84
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "E2E 8714f3ee-ccab-44cf-929f-a91ec9271644 A concurrente":
          - /url: /proveedores/ab352d1d-0c36-45fa-89c1-c4f7f517fdff?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · FICTICIO-8714f3ee-ccab-44cf-929f-a91ec9271644
        - paragraph: Profesional
        - text: Activo
      - listitem:
        - link "E2E 8714f3ee-ccab-44cf-929f-a91ec9271644 B 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀":
          - /url: /proveedores/ae6687da-abd1-4f54-ab77-97aba6f8bb79?denominacion=&identificadorFiscal=&tipo=&paisFiscal=&activo=true&page=0&size=20&sort=denominacion,asc
        - paragraph: ES · 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀8714f3ee-ccab-44cf-929f-a91ec9271644
        - paragraph: Profesional
        - text: Activo
    - navigation "Paginación de proveedores":
      - button "Anterior" [disabled]
      - text: Página 1 · 8 páginas en total
      - button "Siguiente"
- contentinfo: Gestión de Solicitudes · Espacio de trabajo
```

# Test source

```ts
  1   | import { expect, Page, test } from '@playwright/test';
  2   | import { randomUUID } from 'node:crypto';
  3   | import { join } from 'node:path';
  4   | import { verificarAlmacenamientoOperaciones } from './operaciones-ayudas';
  5   | 
  6   | type RolDemo = 'ADMINISTRADOR' | 'SOLICITANTE' | 'SUPERVISOR' | 'AUDITOR';
  7   | 
  8   | async function acceder(page: Page, rol: RolDemo) {
  9   |   await page.goto('/acceso');
  10  |   await page
  11  |     .getByLabel('Correo electrónico', { exact: true })
  12  |     .fill(process.env[`DEMO_${rol}_CORREO`] ?? `${rol.toLowerCase()}@demo.invalid`);
  13  |   await page
  14  |     .getByLabel('Contraseña', { exact: true })
  15  |     .fill(process.env[`DEMO_${rol}_CLAVE`] ?? `Ejemplo local ${rol.toLowerCase()} 2026`);
  16  |   await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  17  |   await expect(page).toHaveURL(/\/mi-cuenta$/);
  18  | }
  19  | 
  20  | async function rellenarProveedor(page: Page, denominacion: string, fiscal: string) {
  21  |   await page.getByLabel('Tipo *', { exact: true }).selectOption('PROFESIONAL');
  22  |   await page.getByLabel('Denominación *', { exact: false }).fill(denominacion);
  23  |   await page.getByLabel('País fiscal *', { exact: false }).fill('ES');
  24  |   await page.getByLabel('Identificador fiscal *', { exact: false }).fill(fiscal);
  25  |   await page.getByLabel('Correo de contacto', { exact: false }).fill('proveedor@demo.invalid');
  26  |   await page.getByLabel('Teléfono de contacto', { exact: false }).fill('+34 000 000 000');
  27  | }
  28  | 
  29  | async function captura(page: Page, nombre: string) {
  30  |   await page.screenshot({
  31  |     path: join(
  32  |       process.env['E2E_SCREENSHOTS_DIR'] ?? 'test-results',
  33  |       `frontend-proveedores-${nombre}.png`,
  34  |     ),
  35  |     fullPage: true,
  36  |   });
  37  | }
  38  | 
  39  | test('PR-10: doce pasos de proveedores con Angular, API y PostgreSQL reales', async ({
  40  |   page,
  41  |   context,
  42  |   browser,
  43  | }) => {
  44  |   test.setTimeout(120000);
  45  |   const marca = randomUUID();
  46  |   const prefijo = `E2E ${marca}`;
  47  |   const fiscal = `FICTICIO-${marca}`;
  48  |   // 63 puntos de código y 90 unidades UTF-16: conserva el caso Unicode y la unicidad.
  49  |   const fiscalUnicode = '😀'.repeat(27) + marca;
  50  |   const denominacionUnicode = `${prefijo} B ${'😀'.repeat(65)}`;
  51  |   let rutaDetalle = '';
  52  |   let escriturasConCsrf = 0;
  53  |   let escriturasSinBearerOCcsrf = 0;
  54  |   page.on('request', (peticion) => {
  55  |     if (
  56  |       new URL(peticion.url()).pathname.startsWith('/api/proveedores') &&
  57  |       ['POST', 'PUT'].includes(peticion.method())
  58  |     ) {
  59  |       const cabeceras = peticion.headers();
  60  |       if (cabeceras['x-xsrf-token'] && cabeceras['authorization']?.startsWith('Bearer '))
  61  |         escriturasConCsrf++;
  62  |       else escriturasSinBearerOCcsrf++;
  63  |     }
  64  |   });
  65  | 
  66  |   await test.step('01 ADMINISTRADOR crea proveedor válido', async () => {
  67  |     await acceder(page, 'ADMINISTRADOR');
  68  |     await page.getByRole('link', { name: 'Proveedores', exact: true }).click();
  69  |     await page.getByRole('link', { name: 'Nuevo proveedor', exact: true }).click();
  70  |     await expect(page.getByRole('heading', { name: 'Nuevo proveedor', exact: true })).toBeFocused();
  71  |     await rellenarProveedor(page, `${prefijo} A`, fiscal);
  72  |     await page.getByRole('button', { name: 'Guardar proveedor', exact: true }).click();
  73  |     await expect(page).toHaveURL(/\/proveedores\/[0-9a-f-]{36}$/);
  74  |     rutaDetalle = new URL(page.url()).pathname;
  75  |     await expect(page.getByRole('heading', { name: `${prefijo} A`, exact: true })).toBeFocused();
  76  |   });
  77  | 
  78  |   await test.step('02 Detalle público y listado muestran la misma alta', async () => {
  79  |     await expect(page.locator('dd')).toContainText([
  80  |       'Profesional',
  81  |       'ES',
  82  |       fiscal,
  83  |       'proveedor@demo.invalid',
  84  |       '+34 000 000 000',
  85  |     ]);
  86  |     await expect(page.locator('.estado')).toHaveText('Activo');
  87  |     await captura(page, 'detalle-escritorio');
  88  |     await page.getByRole('link', { name: 'Volver a proveedores', exact: true }).click();
  89  |     await page.getByLabel('Denominación contiene', { exact: true }).fill(prefijo);
  90  |     await page.getByRole('button', { name: 'Buscar', exact: true }).click();
> 91  |     await expect(page.getByRole('link', { name: `${prefijo} A`, exact: true })).toBeVisible();
      |                                                                                 ^ Error: expect(locator).toBeVisible() failed
  92  |     await page.getByRole('link', { name: `${prefijo} A`, exact: true }).click();
  93  |   });
  94  | 
  95  |   await test.step('03 ADMINISTRADOR modifica los datos editables', async () => {
  96  |     await page.getByRole('link', { name: 'Editar proveedor', exact: true }).click();
  97  |     await page.getByLabel('Denominación *', { exact: false }).fill(`${prefijo} A editado`);
  98  |     await page.getByRole('button', { name: 'Guardar proveedor', exact: true }).click();
  99  |     await expect(
  100 |       page.getByRole('heading', { name: `${prefijo} A editado`, exact: true }),
  101 |     ).toBeVisible();
  102 |   });
  103 | 
  104 |   await test.step('04 Dos ediciones reales producen conflicto visible sin sobrescribir', async () => {
  105 |     await page.getByRole('link', { name: 'Editar proveedor', exact: true }).click();
  106 |     const concurrente = await context.newPage();
  107 |     await concurrente.goto(`${rutaDetalle}/editar`);
  108 |     await expect(concurrente.getByLabel('Denominación *', { exact: false })).toHaveValue(
  109 |       `${prefijo} A editado`,
  110 |     );
  111 |     await concurrente
  112 |       .getByLabel('Denominación *', { exact: false })
  113 |       .fill(`${prefijo} A concurrente`);
  114 |     await concurrente.getByRole('button', { name: 'Guardar proveedor', exact: true }).click();
  115 |     await expect(
  116 |       concurrente.getByRole('heading', { name: `${prefijo} A concurrente`, exact: true }),
  117 |     ).toBeVisible();
  118 |     await page.getByLabel('Denominación *', { exact: false }).fill(`${prefijo} cambio obsoleto`);
  119 |     await page.getByRole('button', { name: 'Guardar proveedor', exact: true }).click();
  120 |     await expect(page.getByRole('alert')).toContainText('Otro usuario ha cambiado este proveedor');
  121 |     await expect(page.getByRole('alert')).toBeFocused();
  122 |     await expect(page.getByLabel('Denominación *', { exact: false })).toHaveValue(
  123 |       `${prefijo} cambio obsoleto`,
  124 |     );
  125 |     await expect(
  126 |       page.getByRole('button', { name: 'Guardar proveedor', exact: true }),
  127 |     ).toBeDisabled();
  128 |     await captura(page, 'conflicto');
  129 |     await page.getByRole('button', { name: 'Recargar datos', exact: true }).click();
  130 |     await expect(page.getByLabel('Denominación *', { exact: false })).toHaveValue(
  131 |       `${prefijo} A concurrente`,
  132 |     );
  133 |     await expect(
  134 |       page.getByRole('button', { name: 'Guardar proveedor', exact: true }),
  135 |     ).toBeEnabled();
  136 |     await concurrente.close();
  137 |   });
  138 | 
  139 |   await test.step('05 ADMINISTRADOR desactiva y conserva detalle', async () => {
  140 |     await page.getByRole('link', { name: 'Cancelar y volver', exact: true }).click();
  141 |     await page.getByRole('button', { name: 'Desactivar proveedor', exact: true }).click();
  142 |     await expect(page.locator('.estado')).toHaveText('Inactivo');
  143 |     await expect(page.locator('app-proveedor-detalle').getByRole('status')).toHaveText(
  144 |       'Proveedor desactivado.',
  145 |     );
  146 |   });
  147 | 
  148 |   await test.step('06 SOLICITANTE y SUPERVISOR no ven el inactivo', async () => {
  149 |     for (const rol of ['SOLICITANTE', 'SUPERVISOR'] as const) {
  150 |       const separado = await browser.newContext({
  151 |         baseURL: process.env['BASE_URL'] ?? 'http://127.0.0.1:18080',
  152 |       });
  153 |       try {
  154 |         const lector = await separado.newPage();
  155 |         await acceder(lector, rol);
  156 |         await lector.goto(`/proveedores?denominacion=${encodeURIComponent(prefijo)}`);
  157 |         await expect(
  158 |           lector.getByText('No hay proveedores para estos filtros o esta página.'),
  159 |         ).toBeVisible();
  160 |         await expect(
  161 |           lector.getByRole('link', { name: 'Nuevo proveedor', exact: true }),
  162 |         ).toHaveCount(0);
  163 |         await expect(lector.locator('option[value="todos"]')).toHaveCount(0);
  164 |         await lector.goto(rutaDetalle);
  165 |         await expect(lector.getByRole('alert')).toHaveText(
  166 |           'El proveedor no existe o no está disponible para tu cuenta.',
  167 |         );
  168 |       } finally {
  169 |         await separado.close();
  170 |       }
  171 |     }
  172 |   });
  173 | 
  174 |   await test.step('07 AUDITOR ve inactivo y carece de escritura', async () => {
  175 |     const separado = await browser.newContext({
  176 |       baseURL: process.env['BASE_URL'] ?? 'http://127.0.0.1:18080',
  177 |     });
  178 |     try {
  179 |       const auditor = await separado.newPage();
  180 |       await acceder(auditor, 'AUDITOR');
  181 |       await auditor.goto(`/proveedores?denominacion=${encodeURIComponent(prefijo)}&activo=false`);
  182 |       await auditor.getByRole('link', { name: `${prefijo} A concurrente`, exact: true }).click();
  183 |       await expect(auditor.locator('.estado')).toHaveText('Inactivo');
  184 |       await expect(
  185 |         auditor.getByRole('link', { name: 'Editar proveedor', exact: true }),
  186 |       ).toHaveCount(0);
  187 |       await expect(
  188 |         auditor.getByRole('button', { name: 'Reactivar proveedor', exact: true }),
  189 |       ).toHaveCount(0);
  190 |       await captura(auditor, 'auditor');
  191 |       await auditor.goto(`${rutaDetalle}/editar`);
```