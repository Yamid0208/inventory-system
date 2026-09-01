# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /source

# Copiar csproj y solución
COPY src/Inventory.Domain/*.csproj src/Inventory.Domain/
COPY src/Inventory.Application/*.csproj src/Inventory.Application/
COPY src/Inventory.Infrastructure/*.csproj src/Inventory.Infrastructure/
COPY src/Inventory.API/*.csproj src/Inventory.API/
COPY tests/Inventory.Domain.UnitTests/*.csproj tests/Inventory.Domain.UnitTests/
COPY Inventory.sln .

RUN dotnet restore Inventory.sln

# Copiar código fuente
COPY src/ src/
COPY tests/ tests/

# Ejecutar tests unitarios
RUN dotnet test tests/Inventory.Domain.UnitTests/Inventory.Domain.UnitTests.csproj --logger "console;verbosity=normal"

# Publicar API
RUN dotnet publish src/Inventory.API/Inventory.API.csproj -c Release -o /app/publish

# Runtime stage (con soporte completo de globalización para SqlClient en Alpine)
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache icu-libs icu-data-full tzdata
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false
ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Development

RUN mkdir -p /app/uploads && chown -R $APP_UID:$APP_UID /app

COPY --from=build /app/publish .

USER $APP_UID
EXPOSE 8080

ENTRYPOINT ["dotnet", "Inventory.API.dll"]
