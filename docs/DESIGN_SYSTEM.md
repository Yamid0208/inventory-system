# Catálogo y Especificación del Design System (Front-End Core)

**Tecnología:** Angular 18 (Standalone Components, Signals, `OnPush`) + Tailwind CSS v3.4 + Angular Material  
**Ubicación:** `frontend/src/app/shared/components`  
**Directorio de Exports:** `src/app/shared/components/index.ts`  
**Accesibilidad:** Cumplimiento de WCAG 2.1 AA (contraste semántico, foco visible, roles ARIA, navegación por teclado)

---

## 1. Tokens de Diseño y Paleta de Colores

| Token Semántico | Clase Tailwind | Uso Principal |
| :--- | :--- | :--- |
| **Primary** | `primary-600` / `primary-500` | Acciones principales, botones CTA, badges activos |
| **Secondary** | `slate-700` / `slate-600` | Acciones secundarias, bordes y fondos de tarjetas |
| **Surface** | `slate-900` / `slate-950` | Fondo general de la aplicación (Dark theme enterprise) |
| **Success** | `emerald-600` / `emerald-400` | Entidades activas, stock disponible, ventas completadas |
| **Warning** | `amber-500` / `amber-400` | Stock bajo, recepciones pendientes, advertencias |
| **Danger** | `rose-600` / `rose-400` | Stock agotado, acciones destructivas, errores de validación |
| **Info** | `sky-500` / `sky-400` | Mensajes informativos, notas de auditoría |

---

## 2. Catálogo de Componentes Reutilizables

### 1. `AppButtonComponent` (`<app-button>`)
Botón accesible con soporte nativo para estados de carga asíncrona y deshabilitado.
* **Selector:** `app-button`
* **Inputs:**
  * `variant`: `'primary' | 'secondary' | 'outline' | 'danger' | 'success'` (default: `'primary'`)
  * `size`: `'sm' | 'md' | 'lg'` (default: `'md'`)
  * `type`: `'button' | 'submit' | 'reset'` (default: `'button'`)
  * `disabled`: `boolean` (default: `false`)
  * `loading`: `boolean` (default: `false`) - Muestra spinner SVG y deshabilita interacción.
  * `fullWidth`: `boolean` (default: `false`)
* **Outputs:**
  * `clicked`: `output<MouseEvent>()`
* **Ejemplo:**
```html
<app-button variant="primary" size="md" [loading]="isSubmitting()" (clicked)="onSave()">
  Guardar Producto
</app-button>
```

---

### 2. `AppBadgeComponent` (`<app-badge>`)
Píldora semántica para representar estados y clasificaciones visuales con punto indicador (`dot`).
* **Selector:** `app-badge`
* **Inputs:**
  * `variant`: `'success' | 'warning' | 'danger' | 'info' | 'neutral'` (default: `'neutral'`)
  * `label`: `string`
  * `dot`: `boolean` (default: `true`)
* **Ejemplo:**
```html
<app-badge variant="success" label="En Stock"></app-badge>
<app-badge variant="danger" label="Agotado"></app-badge>
```

---

### 3. `AppCardComponent` (`<app-card>`)
Contenedor modular con ranuras de proyección estructurada para cabecera, contenido y pie.
* **Selector:** `app-card`
* **Inputs:**
  * `title`: `string`
  * `subtitle`: `string`
* **Slots (`ng-content`):**
  * `[card-actions]`: Botones o controles en la esquina superior derecha.
  * `Default`: Contenido central del card.
  * `[card-footer]`: Barra de acciones inferior.
* **Ejemplo:**
```html
<app-card title="Métricas de Inventario" subtitle="Resumen de existencias en almacén central">
  <div card-actions>
    <app-button variant="outline" size="sm">Exportar</app-button>
  </div>
  <p>Contenido principal de la tarjeta...</p>
</app-card>
```

---

### 4. `AppSearchComponent` (`<app-search>`)
Campo de búsqueda reactivo con debounce y botón para limpiar contenido.
* **Selector:** `app-search`
* **Inputs:**
  * `placeholder`: `string` (default: `'Buscar...'`)
  * `debounceMs`: `number` (default: `400`)
* **Outputs:**
  * `search`: `output<string>()` — Emite el valor filtrado tras el retardo sin repeticiones.
* **Ejemplo:**
```html
<app-search placeholder="Buscar por SKU o descripción..." (search)="onFilterProducts($event)">
</app-search>
```

---

### 5. `AppPaginationComponent` (`<app-pagination>`)
Barra de navegación de paginación con selector de registros por página y accesibilidad ARIA.
* **Selector:** `app-pagination`
* **Inputs:**
  * `pageNumber`: `number` (default: `1`)
  * `pageSize`: `number` (default: `10`)
  * `totalCount`: `number` (default: `0`)
  * `pageSizeOptions`: `number[]` (default: `[10, 25, 50]`)
* **Outputs:**
  * `pageChange`: `output<PageChangeEvent>()` (`{ pageNumber, pageSize }`)
* **Ejemplo:**
```html
<app-pagination
  [pageNumber]="query.page"
  [pageSize]="query.pageSize"
  [totalCount]="totalRecords()"
  (pageChange)="onPageChange($event)">
</app-pagination>
```

---

### 6. `AppDataTableComponent<T>` (`<app-data-table>`)
Tabla de datos genérica tipada con skeleton loading, estado vacío integrado y plantillas de celda (`ngTemplateOutlet`).
* **Selector:** `app-data-table`
* **Inputs:**
  * `columns`: `TableColumn<T>[]`
  * `data`: `T[]`
  * `loading`: `boolean` — Muestra filas animadas en modo skeleton.
  * `emptyTitle`: `string`
  * `emptyDescription`: `string`
* **Outputs:**
  * `rowClick`: `output<T>()`
* **Ejemplo:**
```html
<app-data-table
  [columns]="columns"
  [data]="products()"
  [loading]="isLoading()"
  (rowClick)="onSelectProduct($event)">
</app-data-table>
```

---

### 7. `AppEmptyStateComponent` (`<app-empty-state>`)
Componente para colecciones vacías o búsquedas sin resultados con ranura de acción CTA.
* **Selector:** `app-empty-state`
* **Inputs:**
  * `title`: `string`
  * `description`: `string`
* **Slots:**
  * `[action]`: Botón o enlace para guiar al usuario a crear el primer registro.

---

### 8. `AppErrorStateComponent` (`<app-error-state>`)
Tarjeta de visualización de errores de red o servidor con botón de reintento.
* **Selector:** `app-error-state`
* **Inputs:**
  * `title`: `string`
  * `message`: `string`
* **Outputs:**
  * `retry`: `output<void>()`

---

### 9. `AppConfirmDialogComponent` (`<app-confirm-dialog>`)
Modal de diálogo accesible para acciones irreversibles (anulaciones de compras, eliminación lógica).
* **Selector:** `app-confirm-dialog`
* **Inputs:**
  * `isOpen`: `boolean`
  * `title`: `string`
  * `message`: `string`
  * `confirmText`: `string`
  * `cancelText`: `string`
  * `isDanger`: `boolean`
  * `loading`: `boolean`
* **Outputs:**
  * `confirmed`: `output<void>()`
  * `cancelled`: `output<void>()`

---

### 10. Pipes de Utilidad
* `CurrencyFormatPipe` (`| currencyFormat`): Formatea montos monetarios según el estándar monetario fijado (`$1,250.00 USD`).
* `DateFormatPipe` (`| dateFormat`): Formatea marcas temporales UTC a la fecha local (`DD/MM/YYYY HH:mm`).
