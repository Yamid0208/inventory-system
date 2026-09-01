# Modelo de Base de Datos — Catálogo Relacional (EF Core 8)

**Motor:** Microsoft SQL Server 2022 Developer Edition  
**Aislamiento:** `READ_COMMITTED_SNAPSHOT ON`  
**Collation:** `Latin1_General_CI_AS`  
**Estrategia de Migración:** Code First (`InitialCatalog`)

---

## 1. Tablas y Esquema Físico

### Tabla `Categories`
| Columna | Tipo SQL | Nulo | Restricciones / Índices | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `Id` | `int` | NO | `PRIMARY KEY IDENTITY(1,1)` | Identificador autonumérico |
| `Name` | `nvarchar(100)` | NO | Índice único `UX_Categories_Name` (`WHERE IsDeleted = 0`) | Nombre de la categoría |
| `Description` | `nvarchar(500)` | SÍ | | Detalle descriptivo |
| `IsActive` | `bit` | NO | `DEFAULT 1` | Indicador de disponibilidad |
| `CreatedAt` | `datetimeoffset` | NO | | Fecha de creación UTC |
| `UpdatedAt` | `datetimeoffset` | SÍ | | Fecha de modificación UTC |
| `IsDeleted` | `bit` | NO | `DEFAULT 0` | Bandera de borrado lógico |
| `DeletedAt` | `datetimeoffset` | SÍ | | Fecha de baja lógica |

### Tabla `Suppliers`
| Columna | Tipo SQL | Nulo | Restricciones / Índices | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `Id` | `int` | NO | `PRIMARY KEY IDENTITY(1,1)` | Identificador autonumérico |
| `Name` | `nvarchar(150)` | NO | | Razón social o nombre |
| `TaxId` | `nvarchar(30)` | NO | Índice único `UX_Suppliers_TaxId` (`WHERE IsDeleted = 0`) | Identificador fiscal (RUT/RFC/CIF) |
| `ContactName` | `nvarchar(100)` | SÍ | | Nombre de persona de contacto |
| `Email` | `nvarchar(150)` | SÍ | | Correo electrónico |
| `Phone` | `nvarchar(30)` | SÍ | | Teléfono de contacto |
| `Address` | `nvarchar(300)` | SÍ | | Dirección física |
| `IsActive` | `bit` | NO | `DEFAULT 1` | Indicador de disponibilidad |
| `CreatedAt` | `datetimeoffset` | NO | | Fecha de creación UTC |
| `UpdatedAt` | `datetimeoffset` | SÍ | | Fecha de modificación UTC |
| `IsDeleted` | `bit` | NO | `DEFAULT 0` | Bandera de borrado lógico |
| `DeletedAt` | `datetimeoffset` | SÍ | | Fecha de baja lógica |

### Tabla `Products`
| Columna | Tipo SQL | Nulo | Restricciones / Índices | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `Id` | `int` | NO | `PRIMARY KEY IDENTITY(1,1)` | Identificador autonumérico |
| `Sku` | `nvarchar(50)` | NO | Índice único `UX_Products_Sku` (`WHERE IsDeleted = 0`) | Código único de producto |
| `Name` | `nvarchar(200)` | NO | | Nombre comercial |
| `Description` | `nvarchar(1000)` | SÍ | | Descripción técnica/comercial |
| `CategoryId` | `int` | NO | FK `FK_Products_Categories` (`ON DELETE RESTRICT`), `IX_Products_CategoryId` | Relación con Categoría |
| `SupplierId` | `int` | NO | FK `FK_Products_Suppliers` (`ON DELETE RESTRICT`), `IX_Products_SupplierId` | Relación con Proveedor |
| `PurchasePrice`| `decimal(18,2)`| NO | `CHECK ([PurchasePrice] >= 0)` | Precio de compra unitario |
| `SalePrice` | `decimal(18,2)`| NO | `CHECK ([SalePrice] >= 0)` | Precio de venta al público |
| `CurrentStock` | `int` | NO | `DEFAULT 0`, `CHECK ([CurrentStock] >= 0)` | Stock disponible actual |
| `MinimumStock` | `int` | NO | `DEFAULT 5`, `CHECK ([MinimumStock] >= 0)` | Umbral para alerta de stock bajo |
| `ImageUrl` | `nvarchar(500)` | SÍ | | Ruta relativa de imagen (`/uploads/...`) |
| `IsActive` | `bit` | NO | `DEFAULT 1` | Disponibilidad para operaciones |
| `RowVersion` | `rowversion` | NO | Token de concurrencia optimista | Control anti race-conditions |
| `CreatedAt` | `datetimeoffset` | NO | | Fecha de creación UTC |
| `UpdatedAt` | `datetimeoffset` | SÍ | | Fecha de modificación UTC |
| `IsDeleted` | `bit` | NO | `DEFAULT 0` | Bandera de borrado lógico |
| `DeletedAt` | `datetimeoffset` | SÍ | | Fecha de baja lógica |

---

## 2. Índices Especiales
- `IX_Products_CurrentStock_MinimumStock` en `Products(CurrentStock, MinimumStock)`: Optimiza la consulta en tiempo real de productos con stock bajo o agotados en el Dashboard.
- Índices filtrados únicos (`UX_*`) garantizan unicidad ignorando registros con `IsDeleted = 1`, permitiendo reusar nombres o SKUs si un registro previo fue dado de baja lógica.
