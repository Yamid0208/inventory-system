# Build stage for SPA Host (using cached .NET Alpine SDK)
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src
COPY Host/ .
RUN dotnet publish FrontendHost.csproj -c Release -o /app/publish

# Runtime stage (using cached .NET Alpine runtime)
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app
COPY --from=build /app/publish .
COPY dist/inventory-frontend/browser ./wwwroot

ENV ASPNETCORE_HTTP_PORTS=80
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 80

ENTRYPOINT ["dotnet", "FrontendHost.dll"]
