# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: operaciones.spec.ts >> CI-07/09: bloqueo PostgreSQL real produce progreso acotado en segunda pestaña
- Location: frontend\e2e\operaciones.spec.ts:611:5

# Error details

```
Error: Command failed: docker compose --env-file C:\Users\carli\gestion-solicitudes-asistida-por-ia\infraestructura\.env.example -f infraestructura/compose.yaml exec -T postgres psql -U administrador_local -d gestion -v ON_ERROR_STOP=1 -tAc SELECT count(*) FROM pg_stat_activity WHERE application_name='e2e006_292d89cc4bbe481eb00cbf5e974efd01' AND wait_event='PgSleep'
service "postgres" is not running

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
      - link "Solicitudes" [ref=f1e10] [cursor=pointer]:
        - /url: /solicitudes
      - link "Proveedores" [ref=f1e11] [cursor=pointer]:
        - /url: /proveedores
      - link "Historial" [ref=f1e12] [cursor=pointer]:
        - /url: /historial
      - link "Mi cuenta" [ref=f1e13] [cursor=pointer]:
        - /url: /mi-cuenta
    - generic [ref=f1e14]: Entorno local
  - main [ref=f1e15]:
    - region "Operaciones seguras" [ref=f1e17]:
      - article [ref=f1e18]:
        - generic [ref=f1e19]:
          - strong [ref=f1e20]: Desactivación de proveedor
          - status [ref=f1e21]: Enviando operación…
    - region [ref=f1e23]:
      - link "Volver a proveedores" [ref=f1e24] [cursor=pointer]:
        - /url: /proveedores
      - heading "Progreso006 95c1b3f4-9133-490a-9ba4-a8ee7d7c0be4" [level=1] [ref=f1e25]
      - status
      - generic [ref=f1e26]:
        - paragraph [ref=f1e27]: Activo
        - generic [ref=f1e28]:
          - term [ref=f1e29]: Tipo
          - definition [ref=f1e30]: Profesional
          - term [ref=f1e31]: País fiscal
          - definition [ref=f1e32]: ES
          - term [ref=f1e33]: Identificador fiscal
          - definition [ref=f1e34]: FICTICIO-10b3f52c-ee3d-41ce-8a30-a8b1be8a2cce
          - term [ref=f1e35]: Correo de contacto
          - definition [ref=f1e36]: Sin indicar
          - term [ref=f1e37]: Teléfono de contacto
          - definition [ref=f1e38]: Sin indicar
          - term [ref=f1e39]: Creación
          - definition [ref=f1e40]: 16/10/2026 00:56
          - term [ref=f1e41]: Última actualización
          - definition [ref=f1e42]: 16/10/2026 00:56
        - button "Guardando…" [disabled] [ref=f1e44]
      - region [ref=f1e46]:
        - generic [ref=f1e47]:
          - generic [ref=f1e48]:
            - paragraph [ref=f1e49]: TRAZABILIDAD
            - heading "Historial registrado" [level=2] [ref=f1e50]
          - link "Abrir historial completo" [ref=f1e51] [cursor=pointer]:
            - /url: /proveedores/ec29d2dd-2b72-41ec-8d2b-3c6113faf6f5/historial?page=0&size=20
        - paragraph [ref=f1e52]: Más recientes primero · Fechas mostradas en Europe/Madrid.
        - form "Filtros del historial" [ref=f1e53]:
          - generic [ref=f1e54]:
            - generic [ref=f1e55]:
              - generic [ref=f1e56]: Acción
              - combobox "Acción" [ref=f1e57]:
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
            - generic [ref=f1e58]:
              - generic [ref=f1e59]: Actor (UUID)
              - textbox "Actor (UUID)" [ref=f1e60]
            - generic [ref=f1e61]:
              - generic [ref=f1e62]: Desde (ISO con zona)
              - textbox "Desde (ISO con zona)" [ref=f1e63]:
                - /placeholder: 2026-10-15T00:00:00+02:00
            - generic [ref=f1e64]:
              - generic [ref=f1e65]: Hasta (ISO con zona)
              - textbox "Hasta (ISO con zona)" [ref=f1e66]:
                - /placeholder: 2026-10-15T23:59:59+02:00
            - generic [ref=f1e67]:
              - generic [ref=f1e68]: Eventos por página
              - combobox "Eventos por página" [ref=f1e69]:
                - option "1"
                - option "10"
                - option "20" [selected]
                - option "50"
                - option "100"
          - paragraph [ref=f1e70]: Fechas inclusivas. Indica Z para UTC o el desfase, por ejemplo +02:00.
          - generic [ref=f1e71]:
            - button "Aplicar filtros" [ref=f1e72] [cursor=pointer]
            - button "Restablecer filtros" [ref=f1e73] [cursor=pointer]
        - generic [ref=f1e74]:
          - status [ref=f1e75]: 1 eventos encontrados
          - list "Eventos del historial" [ref=f1e76]:
            - listitem [ref=f1e77]:
              - generic [ref=f1e78]:
                - heading "Proveedor creado" [level=3] [ref=f1e79]
                - time [ref=f1e80]: 16/10/2026 00:56:24
              - paragraph [ref=f1e81]: Administrador de demostración
              - paragraph [ref=f1e82]: Proveedor creado
              - generic [ref=f1e83]:
                - generic [ref=f1e84]: Sin estado anterior → ACTIVO
                - generic [ref=f1e85]: Versión — → 0
              - paragraph [ref=f1e86]: Evento de negocio
          - navigation "Paginación del historial" [ref=f1e87]:
            - button "Página anterior de eventos" [disabled] [ref=f1e88]
            - generic [ref=f1e89]: Página 1 de 1
            - button "Siguiente página de eventos" [disabled] [ref=f1e90]
          - paragraph [ref=f1e91]: Si se registran eventos nuevos durante la consulta, las páginas pueden desplazarse. Recarga para actualizar.
          - button "Actualizar historial" [ref=f1e92] [cursor=pointer]
  - contentinfo [ref=f1e93]: Gestión de Solicitudes · Espacio de trabajo
```