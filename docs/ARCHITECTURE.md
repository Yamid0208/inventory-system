# Arquitectura del Sistema de Gestión de Inventario (SGI)

## 1. Visión y Principios
El sistema sigue principios de **Clean Architecture** (Arquitectura Limpia) y separación estricta de responsabilidades:
- **Independencia de Frameworks:** La capa de Dominio no depende de librerías externas ni de infraestructura.
- **Separación UI / Negocio:** Los controladores HTTP son delgados y delegan la lógica a la capa de Aplicación y Dominio.
- **Frontend Reactivo:** Angular 18 con Standalone Components y Signals para manejo predecible de estado sincrónico de UI.

## 2. Decisiones Arquitectónicas Aprobadas (ADRs)

### ADR-001: Versión de .NET (8.0 LTS)
- **Decisión:** Utilizar .NET 8 LTS.
- **Motivo:** Soporte a largo plazo garantizado por Microsoft, máxima estabilidad para despliegues empresariales y alto rendimiento en EF Core 8.

### ADR-002: Versión de Angular (18 Standalone)
- **Decisión:** Mantener Angular 18 con Application Builder basado en esbuild.
- **Motivo:** Selección deliberada para asegurar la madurez de la arquitectura Standalone, Signals estables y control flow sintáctico (`@if`, `@for`). Testing integrado con Vitest.

### ADR-003: Almacenamiento de Refresh Tokens en HttpOnly Cookies
- **Decisión:** Los tokens de refresco se transportan y almacenan exclusivamente mediante cookies seguras con flags `HttpOnly; Secure; SameSite=Strict`.
- **Motivo:** Protección total contra robo de tokens mediante vulnerabilidades Cross-Site Scripting (XSS).

### ADR-004: Precisión Decimal y Value Object Money
- **Decisión:** Uso de `decimal` en C# y `DECIMAL(18,2)` en SQL Server, encapsulado en el Value Object `Money (Amount, Currency)`.
- **Motivo:** Eliminación de errores de coma flotante y cálculos financieros redondeados en Backend con `MidpointRounding.AwayFromZero`.

### ADR-005: Desacoplamiento de Archivos vía IFileStorageService
- **Decisión:** Interfaz abstracta `IFileStorageService` implementada inicialmente con `LocalFileStorageService` montada en volumen Docker `/app/uploads`.
- **Motivo:** Permite migrar a almacenamiento Cloud (AWS S3 o Azure Blob Storage) sin alterar la lógica de negocio.
