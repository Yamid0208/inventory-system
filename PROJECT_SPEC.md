# Especificación Técnica Consolidada - Sistema de Gestión de Inventarios (SGI PRO)

El **Sistema de Gestión de Inventarios (SGI PRO)** es una solución empresarial de alta gama diseñada para el control patrimonial, kardex valorizado, compras, facturación, trazabilidad por lotes, reportes y administración de almacenes.

---

## 1. Arquitectura del Sistema

```
  ┌─────────────────────────────────────────────────────────┐
  │                 Front-End (Angular 18)                  │
  │   - Standalone Components & Signals                     │
  │   - Tailwind CSS + Dark Mode Class                      │
  │   - RxJS Reactive Pipelines & Debounce (350ms)          │
  │   - ControlValueAccessor Form Core & A11y (WCAG 2.1 AA) │
  │   - Session Timeout & Automatic Safe Logout             │
  └────────────────────────────┬────────────────────────────┘
                               │ HTTP / JSON (JWT Bearer)
                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │               Back-End (.NET 8 Web API)                 │
  │   - Clean Architecture (Domain, Application,            │
  │     Infrastructure, Presentation/API)                   │
  │   - Entity Framework Core 8 con SQL Server 2022         │
  │   - Execution Strategy & Transacciones ACID             │
  │   - Autenticación JWT + Refresh Tokens & RBAC           │
  │   - Kardex Multidireccional & Devoluciones Atómicas     │
  │   - Lotes y Trazabilidad FEFO                           │
  │   - Reportes CSV RFC-4180 con UTF-8 BOM                 │
  └────────────────────────────┬────────────────────────────┘
                               │ TCP / 1433
                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │         Motor de Datos (Microsoft SQL Server 2022)      │
  │   - Claves Primarias, Foráneas e Índices Únicos         │
  │   - Índices de Alto Rendimiento en Consultas Paginadas  │
  │   - Auditoría Histórica Inmutable                       │
  └─────────────────────────────────────────────────────────┘
```

---

## 2. Resumen Ejecutivo de Tareas Ejecutadas (T-001 a T-030)

| Tarea | Módulo / Componente | Estado | Aspectos Clave Implementados |
| :---: | :--- | :---: | :--- |
| **T-001** | Inicialización del Proyecto | ✅ | Arquitectura limpia .NET 8, estructura Angular 18 y Docker Compose. |
| **T-002** | Base de Datos y Persistencia | ✅ | Modelado relacional EF Core, migraciones y seeds iniciales. |
| **T-003** | Autenticación y Autorización | ✅ | JWT tokens, refresh tokens, PBKDF2 hashing y Guards en SPA. |
| **T-004** | Layout Principal y Navegación | ✅ | Sidebar responsivo, Navbar con perfil de usuario y breadcrumbs. |
| **T-005** | CRUD de Categorías y Proveedores | ✅ | Gestión de metadatos del catálogo con modales accesibles. |
| **T-006** | Catálogo de Productos | ✅ | Paginación, búsqueda, filtros de stock y detalle modal. |
| **T-007** | Movimientos y Kardex | ✅ | Registro atómico de entradas, salidas y ajustes con saldos. |
| **T-008** | Módulo de Compras | ✅ | Órdenes de compra con recepción en bodega e incremento de stock. |
| **T-009** | Módulo de Ventas | ✅ | Facturación atómica, cálculo de IVA (19%) y validación RN-001. |
| **T-010** | Tablero Ejecutivo (Dashboard) | ✅ | Métricas de valuación patrimonial, gráficos y accesos rápidos. |
| **T-011** | Gestión de Usuarios y RBAC | ✅ | Administración de cuentas, activación/desactivación y roles. |
| **T-012** | Sistema de Alertas de Stock | ✅ | Detección de existencias mínimas y descartes auditados. |
| **T-013** | Registro de Auditoría Inmutable | ✅ | Trazabilidad forense de transacciones con IP y usuario. |
| **T-014** | Centro de Reportes y Exportación | ✅ | Descarga de CSV bajo estándar RFC-4180 con UTF-8 BOM. |
| **T-015** | Módulo de Clientes (Directorio) | ✅ | Libreta de clientes con historial de compras asociadas. |
| **T-016** | Parámetros y Configuración | ✅ | Configuración de IVA, moneda y datos de la empresa. |
| **T-017** | Optimización de Rendimiento | ✅ | Índices de base de datos, lazy loading y compresión. |
| **T-018** | Pruebas de Regresión y Estabilidad | ✅ | Verificación de flujos punta a punta e integridad relacional. |
| **T-019** | Verificación E2E Consolidada | ✅ | Inspección cruzada y verificación de consistencia global. |
| **T-020** | Sistema Toaster de Notificaciones | ✅ | Toast centralizado reactivo (`AppToasterComponent`, `NotificationService`). |
| **T-021** | Componentes de Formulario Core | ✅ | `AppFormField`, `AppInput`, `AppSelect`, `AppDatePicker` (CVA + A11y). |
| **T-022** | Devoluciones y Anulaciones | ✅ | Devoluciones cliente/proveedor en Kardex con restitución atómica. |
| **T-023** | Gestión de Lotes y FEFO | ✅ | Entidad `ProductBatch`, ordenamiento FEFO y badges de vencimiento. |
| **T-024** | Control de Sesión y Auto-Logout | ✅ | Detección de inactividad a los 15 min con modal de aviso a los 60s. |
| **T-025** | Modo Oscuro y Accesibilidad Visual | ✅ | `ThemeService` con `darkMode: 'class'` y sincronización a preferencias de SO. |
| **T-026** | Búsqueda Reactiva con Debounce | ✅ | `AppSearchComponent` con `debounceTime(350ms)` y `distinctUntilChanged`. |
| **T-027** | Reportes Analíticos Gráficos | ✅ | Gráficos visuales de flujo comercial, margen bruto y distribución de stock. |
| **T-028** | Comprobantes y Facturas Imprimibles| ✅ | Estilos `@media print`, membrete fiscal con NIT y DIAN, firmas legales. |
| **T-029** | Pipeline de CI/CD (GitHub Actions) | ✅ | Workflow `.github/workflows/ci.yml` (.NET 8, Angular 18, Docker). |
| **T-030** | Documentación Integral del Sistema | ✅ | Catálogo de APIs, guía de despliegue, matriz RN/RNF y especificación. |

---

## 3. Métricas de Calidad y Pruebas Automatizadas

- **Suites de Pruebas Unitarias de Front-End:** 35 suites de pruebas en Vitest.
- **Pruebas Automatizadas Ejecutadas y Aprobadas:** **98 / 98 pruebas (100% de éxito)**.
- **Compilación de Producción Back-End (.NET 8):** 0 errores, 0 advertencias.
- **Compilación de Producción Front-End (Angular 18):** 0 errores, 0 advertencias.
- **Validación de Configuración Docker Compose:** 100% válida.
- **Cumplimiento de Reglas de Negocio:** 12 de 12 reglas estrictamente validadas.
