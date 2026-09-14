# Matriz de Trazabilidad: Reglas de Negocio (RN) y Requerimientos No Funcionales (RNF)

Esta matriz documenta la correspondencia estricta entre las especificaciones del sistema, las capas arquitectónicas donde fueron implementadas y sus mecanismos de validación.

---

## 1. Reglas de Negocio (RN)

| Código | Descripción de la Regla | Capa de Implementación | Componente / Archivo | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **RN-001** | **No permitir stock negativo:** Ninguna venta, ajuste de salida o devolución puede reducir el stock físico de un producto por debajo de cero. | Dominio & Aplicación | `SaleService.cs`, `InventoryService.cs`, `Product.cs` | ✅ Cumplido |
| **RN-002** | **Alerta automática por stock mínimo:** Generación de registro de alerta y feedback visual inmediato cuando el stock actual sea $\le$ `MinStock`. | Dominio & Base de Datos | `InventoryMovement`, `AlertsController.cs`, `AlertService.cs` | ✅ Cumplido |
| **RN-003** | **SKU Único e Inmutable en catálogo:** El código SKU debe ser único a nivel de base de datos (`UNIQUE INDEX`) y no modificable tras su creación. | Infraestructura / Persistencia | `ProductConfiguration.cs`, `ProductsController.cs` | ✅ Cumplido |
| **RN-004** | **Auditoría Inmutable de Transacciones:** Cada movimiento en Kardex, cambio de usuario o ajuste de inventario debe registrar fecha UTC, usuario y saldo resultante. | Aplicación & Dominio | `AuditLog.cs`, `AuditInterceptor.cs`, `InventoryMovement.cs` | ✅ Cumplido |
| **RN-005** | **Control de Roles y Autorización (RBAC):** Las operaciones destructivas, asignación de roles y configuraciones globales requieren rol `Admin`. | Presentación API & SPA | `[Authorize(Roles = "...")]`, `role.guard.ts` | ✅ Cumplido |
| **RN-006** | **Anulación y Devoluciones con Restitución Atómica:** Toda anulación de venta o devolución de cliente reincorpora automáticamente las unidades a bodega bajo transacción atómica. | Aplicación & DB Transaction | `SalesController.cs`, `InventoryService.cs` (`ProcessReturnAsync`) | ✅ Cumplido |
| **RN-007** | **Trazabilidad por Lotes y FEFO:** Los productos perecederos se registran con lote y fecha de vencimiento, ordenados por prioridad de vencimiento más próximo. | Dominio & Persistencia | `ProductBatch.cs`, `BatchService.cs`, `BatchesController.cs` | ✅ Cumplido |
| **RN-008** | **Desglose Impositivo Oficial (IVA 19%):** Toda venta y compra debe calcular y discriminar la base imponible y el impuesto al valor agregado. | Dominio & Aplicación | `Sale.cs`, `Purchase.cs`, `SaleModalComponent` | ✅ Cumplido |
| **RN-009** | **Inactividad y Cierre de Sesión Seguro:** Cierre preventivo tras 15 minutos sin interacción del usuario con aviso previo a los 60 segundos. | Núcleo Front-End | `SessionTimeoutService.ts`, `SessionWarningModalComponent.ts` | ✅ Cumplido |
| **RN-010** | **Exportación Estándar RFC-4180:** Los reportes en formato CSV deben incorporar UTF-8 BOM y delimitación conforme a RFC-4180 para compatibilidad universal con hojas de cálculo. | Aplicación & Presentación | `ReportService.cs`, `ReportsController.cs` | ✅ Cumplido |
| **RN-011** | **Debounce en Búsquedas Reactivas:** Toda caja de búsqueda de texto debe aplicar una retención mínima de 350ms y cancelar peticiones duplicadas (`distinctUntilChanged`). | Shared Components | `AppSearchComponent.ts`, `products.component.ts` | ✅ Cumplido |
| **RN-012** | **Ergonomía Visual y Accesibilidad:** Soporte nativo para modo oscuro (`dark` mode) y contraste visual WCAG 2.1 AA. | Núcleo UI & Tailwind | `ThemeService.ts`, `tailwind.config.js`, `NavbarComponent` | ✅ Cumplido |

---

## 2. Requerimientos No Funcionales (RNF)

| Código | Requerimiento No Funcional | Criterio de Aceptación | Mecanismo de Garantía | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **RNF-001** | **Rendimiento:** Tiempos de respuesta de API $\le 200\text{ms}$ en consultas estándar. | Consultas optimizadas con índices | Índices en `Sku`, `CategoryId`, `Status`, paginación en servidor (`IQueryable.Skip.Take`). | ✅ Verificado |
| **RNF-002** | **Disponibilidad y Resiliencia:** Tolerancia a microcortes de red. | Reintentos automáticos (Backoff exponencial) | `resilience.interceptor.ts` en Angular (reintento con delay ante errores 5xx/408). | ✅ Verificado |
| **RNF-003** | **Seguridad Criptográfica:** Almacenamiento seguro de credenciales. | Algoritmo PBKDF2 / Argon2 / BCrypt | `PasswordHasher.cs` con salt criptográfico individual de 128 bits. | ✅ Verificado |
| **RNF-004** | **Accesibilidad (A11y):** Cumplimiento de directrices WCAG 2.1 AA. | Navegación por teclado y lectores de pantalla | Atributos `aria-label`, `role="alert"`, `role="alertdialog"`, modales accesibles. | ✅ Verificado |
| **RNF-005** | **Contenerización y Portabilidad:** Despliegue reproducible en Linux/macOS/Windows. | Construcción multi-etapa Docker | Dockerfiles optimizados basados en imágenes oficiales Alpine Linux (`net8.0-alpine`). | ✅ Verificado |
| **RNF-006** | **Integridad Transaccional:** Atomicidad en operaciones de inventario (ACID). | Rollback ante cualquier fallo intermedio | Transacciones explícitas EF Core (`IDbContextTransaction`) con Execution Strategy. | ✅ Verificado |
| **RNF-007** | **Automatización CI/CD:** Verificación continua de compilación y pruebas. | Pipeline verde en cada commit/PR | GitHub Actions (`.github/workflows/ci.yml`) con jobs paralelos. | ✅ Verificado |
