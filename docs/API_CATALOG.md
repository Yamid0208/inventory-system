# Catálogo Exhaustivo de APIs REST - SGI Inventory System

Este documento detalla la totalidad de las rutas y controladores REST expuestos por el Back-End (.NET 8 Web API) del Sistema de Gestión de Inventarios.

**URL Base de la API:** `http://localhost:5001/api/v1` (Mapeado a puerto 8080 interno de contenedor)  
**Formato de Intercambio:** `application/json` (con codificación UTF-8)  
**Esquema de Autenticación:** `Bearer <JWT_TOKEN>` en la cabecera HTTP `Authorization`.

---

## 1. Módulo de Autenticación (`/api/v1/auth`)

| Método | Endpoint | Roles Permitidos | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Público (Anónimo) | Autenticación con email/password. Retorna JWT token, datos de usuario y roles. |
| `POST` | `/api/v1/auth/refresh` | Público | Renovación de token de acceso mediante Refresh Token. |
| `POST` | `/api/v1/auth/logout` | Autenticado | Invalidación de sesión activa y revocación de Refresh Token. |

---

## 2. Módulo de Catálogo de Productos (`/api/v1/products`)

| Método | Endpoint | Roles Permitidos | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/products` | Admin, Warehouse, Cashier, Auditor | Listado paginado con filtros de texto, categoría y estado de stock (`in_stock`, `low_stock`, `out_of_stock`). |
| `GET` | `/api/v1/products/{id}` | Admin, Warehouse, Cashier, Auditor | Detalle técnico completo de un producto por ID. |
| `POST` | `/api/v1/products` | Admin, Warehouse | Creación de nuevo ítem con SKU único y stock inicial. |
| `PUT` | `/api/v1/products/{id}` | Admin, Warehouse | Actualización de datos descriptivos, precios y stocks mínimos/máximos. |
| `DELETE` | `/api/v1/products/{id}` | Admin | Desactivación lógica (Soft Delete) de un ítem. |

---

## 3. Módulo de Lotes y Vencimientos (`/api/v1/products/{productId}/batches`)

| Método | Endpoint | Roles Permitidos | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/products/{productId}/batches` | Admin, Warehouse, Cashier | Consulta de lotes activos ordenados por política FEFO (First Expired, First Out). |
| `POST` | `/api/v1/products/{productId}/batches` | Admin, Warehouse | Registro de nuevo lote con número, fecha de vencimiento y unidades iniciales. |

---

## 4. Módulo de Movimientos y Kardex (`/api/v1/inventory`)

| Método | Endpoint | Roles Permitidos | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/inventory/movements` | Admin, Warehouse, Auditor | Histórico cronológico de movimientos (Entradas, Salidas, Ajustes, Devoluciones) con balance de saldos. |
| `POST` | `/api/v1/inventory/adjustments` | Admin, Warehouse | Ajuste manual auditado de stock físico (motivos: conteo, merma, daño). |
| `POST` | `/api/v1/inventory/returns` | Admin, Warehouse | Procesamiento de devoluciones (Cliente o Proveedor) con restitución atómica de saldos. |

---

## 5. Módulo de Compras a Proveedores (`/api/v1/purchases`)

| Método | Endpoint | Roles Permitidos | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/purchases` | Admin, Warehouse, Auditor | Listado paginado de órdenes de compra con estado (`Pending`, `Received`, `Cancelled`). |
| `GET` | `/api/v1/purchases/{id}` | Admin, Warehouse, Auditor | Detalle de orden de compra con ítems desglosados y costos unitarios. |
| `POST` | `/api/v1/purchases` | Admin, Warehouse | Creación de orden de compra en estado `Pending`. |
| `POST` | `/api/v1/purchases/{id}/receive` | Admin, Warehouse | Recepción en bodega: incrementa stock físico y genera movimiento de entrada en Kardex. |
| `POST` | `/api/v1/purchases/{id}/cancel` | Admin | Cancelación de orden pendiente. |

---

## 6. Módulo de Ventas y Facturación (`/api/v1/sales`)

| Método | Endpoint | Roles Permitidos | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/sales` | Admin, Cashier, Auditor | Histórico de ventas paginado con filtros de fecha y cliente. |
| `GET` | `/api/v1/sales/{id}` | Admin, Cashier, Auditor | Detalle de venta con desglose de impuestos (IVA 19%), subtotal y total. |
| `POST` | `/api/v1/sales` | Admin, Cashier | Creación y facturación atómica: valida stock disponible (RN-001), descuenta existencias y genera salida en Kardex. |
| `POST` | `/api/v1/sales/{id}/cancel` | Admin | Anulación formal de venta y reincorporación automática de inventario a bodega. |

---

## 7. Módulo de Tablero Ejecutivo (`/api/v1/dashboard`)

| Método | Endpoint | Roles Permitidos | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/dashboard/summary` | Admin, Warehouse, Cashier, Auditor | Métricas consolidadas en tiempo real: valuación total de inventario, ventas y compras mensuales, distribución por categorías y alertas críticas. |

---

## 8. Módulo de Clientes y Proveedores (`/api/v1/customers`, `/api/v1/suppliers`, `/api/v1/categories`)

| Módulo | Endpoint Base | Roles Lectura | Roles Escritura |
| :--- | :--- | :--- | :--- |
| **Categorías** | `/api/v1/categories` | Todos los autenticados | Admin, Warehouse |
| **Proveedores** | `/api/v1/suppliers` | Todos los autenticados | Admin, Warehouse |
| **Clientes** | `/api/v1/customers` | Admin, Cashier, Auditor | Admin, Cashier |

---

## 9. Módulo de Administración de Usuarios y Roles (`/api/v1/users`, `/api/v1/roles`)

| Método | Endpoint | Roles Permitidos | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users` | Admin | Listado de colaboradores, estados (`Active`, `Inactive`) y roles asignados. |
| `POST` | `/api/v1/users` | Admin | Creación de nuevo usuario con contraseña cifrada (BCrypt/PBKDF2). |
| `PUT` | `/api/v1/users/{id}` | Admin | Modificación de nombre, email, estado y asignación de roles. |
| `GET` | `/api/v1/roles` | Admin | Catálogo de roles del sistema (`Admin`, `Warehouse`, `Cashier`, `Auditor`). |

---

## 10. Módulo de Alertas, Auditoría y Reportes

| Módulo | Endpoint | Roles Permitidos | Descripción |
| :--- | :--- | :--- | :--- |
| **Alertas** | `GET /api/v1/alerts` | Admin, Warehouse | Notificaciones de stock mínimo y productos agotados. |
| **Alertas** | `POST /api/v1/alerts/{id}/dismiss` | Admin, Warehouse | Descarte de alerta activa por el operador. |
| **Auditoría** | `GET /api/v1/audit/logs` | Admin, Auditor | Registro inmutable de transacciones críticas con IP, usuario y timestamp UTC. |
| **Reportes** | `GET /api/v1/reports/summary` | Admin, Auditor | Catálogo de reportes y metadatos de exportación. |
| **Reportes** | `GET /api/v1/reports/{key}/csv` | Admin, Auditor | Descarga de conjunto de datos en CSV (RFC-4180 con UTF-8 BOM). |
| **Ajustes** | `GET / PUT /api/v1/settings` | Admin | Parámetros globales del sistema (IVA, moneda, razón social). |
