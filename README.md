# Sistema de Gestión de Inventario (SGI)

Plataforma empresarial de gestión de inventario basada en Clean Architecture (.NET 8 LTS) y Frontend reactivo con Angular 18 Standalone Components.

## Stack Tecnológico

- **Backend:** .NET 8 LTS (C# 12), Entity Framework Core 8, SQL Server 2022.
- **Frontend:** Angular 18 (Standalone Components, Signals, Application Builder basado en esbuild), Tailwind CSS v3.4.
- **Testing:** xUnit para Backend (con FluentAssertions) y Vitest para Frontend.
- **Infraestructura:** Docker Compose, Nginx Alpine, Multi-stage builds.

---

## Inicio Rápido con Docker Compose

Para levantar toda la solución con un único comando:

```bash
docker compose up --build -d
```

### Servicios Expuestos:
- **Frontend (Angular 18 SPA):** [http://localhost:4200](http://localhost:4200)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **Swagger / OpenAPI:** [http://localhost:5000/swagger](http://localhost:5000/swagger)
- **Health Check Endpoint:** [http://localhost:5000/healthz](http://localhost:5000/healthz)
- **SQL Server 2022:** `localhost:1433` (User: `sa`, Password: `StrongP@ssw0rd2024!`)

---

## Estructura del Repositorio

```
inventory-system/
├── backend/            # Solución .NET 8 Clean Architecture
│   ├── src/
│   │   ├── Inventory.Domain/          # Entidades, Value Objects, Enums, Reglas
│   │   ├── Inventory.Application/     # Casos de Uso, DTOs, Interfaces
│   │   ├── Inventory.Infrastructure/  # EF Core, DbContext, Persistencia
│   │   └── Inventory.API/             # Controllers, Middlewares, Program.cs
│   └── tests/
│       └── Inventory.Domain.UnitTests # Pruebas unitarias xUnit
├── frontend/           # Aplicación Angular 18 Standalone
│   └── src/
│       └── app/
│           ├── core/                  # Interceptores, guards, configuración
│           ├── shared/                # Componentes y utilidades reutilizables
│           ├── layout/                # Shell, header, sidebar
│           └── features/              # Módulos funcionales
├── docker/             # Configuraciones de contenedores (Nginx, SQL Server)
├── docs/               # Documentación arquitectónica y guías técnicas
└── docker-compose.yml  # Orquestación de contenedores
```
