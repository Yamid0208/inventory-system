#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE DESPLIEGUE EN PRODUCCIÓN - HOSTINGER VPS
# ==============================================================================
set -euo pipefail

echo "================================================================="
echo "   SISTEMA DE GESTIÓN DE INVENTARIO - DESPLIEGUE EN PRODUCCIÓN   "
echo "================================================================="

# 1. Verificar si existe el archivo .env.production
if [ ! -f ".env.production" ]; then
    echo "❌ ERROR: No se encontró el archivo '.env.production'."
    echo "👉 Por favor copie '.env.production.example' a '.env.production' y configure sus credenciales:"
    echo "   cp .env.production.example .env.production"
    echo "   nano .env.production"
    exit 1
fi

# 2. Verificar que Docker y Docker Compose estén instalados
if ! command -v docker &> /dev/null; then
    echo "❌ ERROR: Docker no está instalado en este sistema."
    echo "   Instálelo con: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# 3. Validar advertencias de claves por defecto
if grep -q "CAMBIE_ESTA_CLAVE" .env.production; then
    echo "⚠️ ADVERTENCIA: La clave Jwt__Key aún contiene el valor por defecto en .env.production."
    echo "   Por favor actualícela antes de continuar."
    exit 1
fi

echo "📦 1. Descargando cambios más recientes del repositorio..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git pull origin "$CURRENT_BRANCH" || true

echo "🔨 2. Construyendo y arrancando contenedores de producción..."
docker compose --env-file .env.production -f docker-compose.prod.yml down --remove-orphans || true
docker compose --env-file .env.production -f docker-compose.prod.yml build --no-cache
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

echo "⏳ 3. Esperando que los servicios inicien y superen los health checks..."
sleep 15

# 4. Verificar estado de los contenedores
docker compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Despliegue completado con éxito."
echo "🌐 Si configuró Nginx, su sistema ya está accesible en su dominio."
echo "📊 Verifique los logs con: docker compose -f docker-compose.prod.yml logs -f"
echo "================================================================="
