# Stage 1: Build Angular Frontend
FROM node:20-alpine AS node-build
WORKDIR /src
ENV CI=true
ENV NG_CLI_ANALYTICS=ci
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build .NET Host
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS dotnet-build
WORKDIR /src
COPY Host/ .
RUN dotnet publish FrontendHost.csproj -c Release -o /app/publish

# Stage 3: Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app
COPY --from=dotnet-build /app/publish .
COPY --from=node-build /src/dist/inventory-frontend/browser ./wwwroot

ENV ASPNETCORE_HTTP_PORTS=80
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 80

ENTRYPOINT ["dotnet", "FrontendHost.dll"]

