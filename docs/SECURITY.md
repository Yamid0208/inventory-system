# Arquitectura de Seguridad, Autenticación y Autorización (ADR 2)

**Estándar:** JWT (JSON Web Tokens) + Refresh Tokens opacos en Cookies HttpOnly Seguras  
**Backend:** ASP.NET Core 8 Web API (`net8.0`) + EF Core 8 + SQL Server 2022  
**Frontend:** Angular 18 Standalone + Signals + Functional Guards & Interceptors  
**Hashing de Contraseñas:** PBKDF2 con HMAC-SHA256, 100,000 iteraciones y salt criptográfico de 128 bits.

---

## 1. Estrategia de Tokens y Ciclo de Vida

| Token | Formato | Duración | Almacenamiento | Propósito |
| :--- | :--- | :--- | :--- | :--- |
| **Access Token** | JWT firmado con HMAC-SHA256 | 15 minutos | Memoria volátil del cliente (Signals) | Autorizar llamadas API en cabecera `Authorization: Bearer <token>` |
| **Refresh Token** | Cadena criptográfica aleatoria de 64 bytes | 7 días | Cookie del navegador (`HttpOnly; Secure; SameSite=Strict`) | Renovar el Access Token sin exponer credenciales a JavaScript ni vulnerabilidades XSS |

### Flags de Seguridad de la Cookie `refreshToken`:
* `HttpOnly`: Impide acceso a la cookie desde scripts del lado cliente (`document.cookie`), mitigando ataques XSS.
* `Secure`: La cookie solo se transmite mediante conexiones cifradas HTTPS (en dev permitido en localhost).
* `SameSite=Strict`: La cookie no se envía en solicitudes entre sitios, mitigando por diseño ataques CSRF.
* `Path=/api/v1/auth`: La cookie solo se envía a los endpoints del subsistema de autenticación.

---

## 2. Detección de Replay Attacks y Rotación

1. **Rotación en Cada Refresco:** Cada vez que el cliente solicita `/api/v1/auth/refresh`, el token actual es revocado (`RevokedAt = UtcNow`) y se emite un nuevo refresh token asociado al usuario.
2. **Detección de Reuso Indebido:** Si un atacante intenta utilizar un token de refresco que ya fue revocado previamente, el sistema detecta la anomalía de seguridad e **invalida automáticamente todas las sesiones activas** del usuario afectado (`RevokeAllRefreshTokens()`).

---

## 3. Roles y Credenciales Iniciales Sembradas

| Rol | Usuario (Email) | Contraseña Inicial | Privilegios y Alcance |
| :--- | :--- | :--- | :--- |
| **`Admin`** | `admin@sgi.local` | `Admin123*` | Control total del sistema, gestión de usuarios, auditoría, configuración. |
| **`Warehouse`** | `almacen@sgi.local` | `Almacen123*` | Recepción de compras, ajustes de inventario, consulta y edición de stock. |
| **`Seller`** | `vendedor@sgi.local` | `Vendedor123*` | Registro y consulta de ventas, consulta de catálogo y precios. |

---

## 4. Endpoints de la API REST (`/api/v1/auth`)

* `POST /api/v1/auth/login`: Autentica credenciales. Emite Access Token en JSON y establece la cookie `refreshToken`.
* `POST /api/v1/auth/refresh`: Lee la cookie `refreshToken` (no requiere body). Rota el token y devuelve nuevo Access Token y nueva cookie.
* `POST /api/v1/auth/logout`: Revoca el refresh token en la base de datos y borra la cookie en el navegador (`Max-Age=0`).
* `GET /api/v1/auth/me`: Endpoint protegido con `[Authorize]`. Retorna los datos del usuario en sesión a partir de los claims del JWT.

---

## 5. Front-End Core Security (`Angular 18`)

* **`authInterceptor`:** Inyecta automáticamente `Authorization: Bearer <token>` y habilita `{ withCredentials: true }`. Si la API responde con `HTTP 401 Unauthorized`, realiza automáticamente un refresco silencioso (`POST /refresh`) y reintenta la petición original de forma transparente.
* **`authGuard`:** Protege rutas que requieren autenticación (`canActivate: [authGuard]`). Si el usuario no está autenticado, lo redirige a `/login` preservando la URL original en `returnUrl`.
* **`roleGuard`:** Valida que el rol del usuario en sesión cumpla con los roles permitidos en `data: { roles: ['Admin'] }`.
