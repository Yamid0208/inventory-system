# Guía Integral de Despliegue y Operación - SGI Inventory System

Este documento describe la topología de infraestructura, configuración de entornos, procedimientos de despliegue mediante Docker y directrices de mantenimiento del Sistema de Gestión de Inventario (SGI).

---

## 1. Topología del Sistema y Mapeo de Puertos

El sistema opera bajo una arquitectura de contenedores multicapa orquestada mediante Docker Compose:

```
                          [ Cliente / Navegador ]
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │   inventory-frontend        │  (Puerto Host: 4200)
                     │   Angular 18 SPA            │  (Puerto Container: 80)
                     └──────────────┬──────────────┘
                                    │  Reverse Proxy / Direct Fetch
                                    ▼
                     ┌─────────────────────────────┐
                     │   inventory-backend         │  (Puerto Host: 5001)
                     │   ASP.NET Core 8 Web API    │  (Puerto Container: 8080)
                     └──────────────┬──────────────┘
                                    │  TCP Port 1433
                                    ▼
                     ┌─────────────────────────────┐
                     │   inventory-sqlserver       │  (Puerto Host: 1433)
                     │   Microsoft SQL Server 2022 │
                     └─────────────────────────────┘
```

> **Nota para macOS:** El puerto 5000 es reservado por Apple AirPlay / Control Center. Por tanto, el servicio Back-End está mapeado al puerto de host **5001** hacia el puerto **8080** del contenedor.

---

## 2. Requisitos Previos de Ejecución

- **Docker Engine:** Versión 24.0 o superior.
- **Docker Compose:** Versión 2.20 o superior.
- **Memoria RAM Mínima:** 4 GB (SQL Server requiere al menos 2 GB dedicados).
- **Espacio en Disco:** 10 GB disponibles para volúmenes de base de datos e imágenes.

---

## 3. Variables de Entorno del Sistema

| Variable | Servicio | Valor por Defecto | Propósito |
| :--- | :--- | :--- | :--- |
| `ASPNETCORE_ENVIRONMENT` | Backend | `Development` / `Production` | Define el perfil de ejecución del runtime de .NET. |
| `ASPNETCORE_HTTP_PORTS` | Backend | `8080` | Puerto interno en el que escucha Kestrel. |
| `ConnectionStrings__DefaultConnection` | Backend | `Server=sqlserver;Database=InventoryDb;User Id=sa;Password=...` | Cadena de conexión ADO.NET / EF Core hacia SQL Server. |
| `Cors__AllowedOrigins` | Backend | `http://localhost:4200` | Orígenes web autorizados para interactuar mediante CORS. |
| `MSSQL_SA_PASSWORD` | SQL Server | `StrongP@ssw0rd2024!` | Contraseña administrativa del motor SQL Server. |
| `ACCEPT_EULA` | SQL Server | `Y` | Aceptación de los términos de licenciamiento de Microsoft. |

---

## 4. Despliegue Automatizado con Docker Compose

### 4.1. Iniciar toda la pila de servicios en segundo plano:
```bash
docker compose up -d --build
```

### 4.2. Verificar el estado de salud de los contenedores:
```bash
docker compose ps
```
El contenedor `inventory-sqlserver` cuenta con un Healthcheck interno que comprueba conectividad mediante `sqlcmd`. Una vez se encuentra `healthy`, el contenedor `inventory-backend` inicia automáticamente.

### 4.3. Visualización de registros en vivo:
```bash
# Ver logs del backend
docker compose logs -f backend

# Ver logs del frontend
docker compose logs -f frontend
```

---

## 5. Procedimientos de Migración y Semillado (Seed)

Las migraciones de Entity Framework Core se aplican automáticamente al arrancar la aplicación Web API si la base de datos no existe o está desactualizada (`context.Database.Migrate()`).

Para ejecutar migraciones manualmente o aplicar cambios de esquema fuera de Docker:
```bash
cd backend
dotnet ef database update --project src/Inventory.Infrastructure --startup-project src/Inventory.API
```

### Credenciales Administrativas por Defecto:
- **Usuario:** `admin@inventory.com`
- **Contraseña:** `Admin123!`
- **Rol:** `Admin` (Acceso irrestricto a todos los módulos)

---

## 6. Procedimiento de Copia de Seguridad (Backup) y Restauración

### Generar Backup de la Base de Datos:
```bash
docker exec -t inventory-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'StrongP@ssw0rd2024!' -C \
  -Q "BACKUP DATABASE [InventoryDb] TO DISK = N'/var/opt/mssql/InventoryDb_Backup.bak' WITH NOFORMAT, NOINIT, SKIP, NOREWIND, NOUNLOAD, STATS = 10"
```

### Restaurar Base de Datos:
```bash
docker exec -t inventory-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'StrongP@ssw0rd2024!' -C \
  -Q "RESTORE DATABASE [InventoryDb] FROM DISK = N'/var/opt/mssql/InventoryDb_Backup.bak' WITH REPLACE"
```
