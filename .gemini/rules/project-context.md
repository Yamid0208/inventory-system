---
trigger: always_on
---

# Contexto Operativo y Parámetros del Proyecto Insincro

## 1. Identidad y Dominio
- **Nombre de la Aplicación:** Insincro (anteriormente StockFlow).
- **Dominio de Producción:** `https://insincro.tech` y `https://www.insincro.tech`.

## 2. Servidor VPS e Infraestructura (Hostinger)
- **Ruta Absoluta del Proyecto en el Servidor VPS:** `/var/www/inventory-system`
- **Coexistencia con otros proyectos:** En el mismo VPS corre **GymTrak**, por lo que los puertos de Insincro están estrictamente aislados:
  - **Frontend / Unified Entrypoint:** Puerto `8081` en el host (`127.0.0.1:8081`). Nginx del host redirige el tráfico de `insincro.tech` (80/443 SSL) hacia este puerto.
  - **Backend API:** Puerto interno Docker `8080` (red `inventory-network`).
  - **PostgreSQL 16:** Puerto interno Docker `5432`. Para administración remota segura (vía SSH Tunnel con TablePlus/DBeaver) se expone a `127.0.0.1:5433` (evitando colisión con PostgreSQL 5432 de GymTrak).

## 3. Comandos Estándar de Despliegue y Actualización en Servidor
```bash
# Conexión y actualización rápida:
cd /var/www/inventory-system
git pull origin main
./deploy/deploy.sh
```

## 4. Archivos de Configuración Clave
- Variables de entorno de producción: `/var/www/inventory-system/.env.production`
- Docker Compose de producción: `/var/www/inventory-system/docker-compose.prod.yml`
- Script de despliegue: `/var/www/inventory-system/deploy/deploy.sh`
- Nginx en el Host: `/etc/nginx/sites-available/insincro.conf` (enlace simbólico en `sites-enabled`)

