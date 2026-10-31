using Inventory.Application.Common.Interfaces;
using Inventory.Application.Common.Models;
using Inventory.Application.Features.Legal.DTOs;
using Inventory.Application.Features.Legal.Services;
using Inventory.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Inventory.Infrastructure.Services;

public class LegalService : ILegalService
{
    public const string CurrentTermsVersion = "1.0";
    public const string CurrentPrivacyVersion = "1.0";
    private static readonly DateTimeOffset CurrentLastUpdated = new(2026, 10, 31, 0, 0, 0, TimeSpan.Zero);

    private readonly IApplicationDbContext _context;
    private readonly ILogger<LegalService> _logger;

    public LegalService(IApplicationDbContext context, ILogger<LegalService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<TermsStatusDto> GetConsentStatusAsync(int userId, CancellationToken cancellationToken = default)
    {
        var acceptance = await _context.TermsAcceptances
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.TermsVersion == CurrentTermsVersion)
            .OrderByDescending(t => t.AcceptedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        return new TermsStatusDto(
            HasAccepted: acceptance != null,
            CurrentTermsVersion: CurrentTermsVersion,
            CurrentPrivacyVersion: CurrentPrivacyVersion,
            AcceptedAt: acceptance?.AcceptedAt,
            IpAddress: acceptance?.IpAddress,
            UserEmail: user?.Email
        );
    }

    public async Task<Result<LegalConsentResultDto>> AcceptTermsAsync(
        int userId,
        AcceptTermsRequest request,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result<LegalConsentResultDto>.Failure("Usuario no encontrado.");
        }

        if (!user.IsActive)
        {
            return Result<LegalConsentResultDto>.Failure("La cuenta de usuario está desactivada.");
        }

        var effectiveTermsVersion = string.IsNullOrWhiteSpace(request.TermsVersion) ? CurrentTermsVersion : request.TermsVersion.Trim();
        var effectivePrivacyVersion = string.IsNullOrWhiteSpace(request.PrivacyPolicyVersion) ? CurrentPrivacyVersion : request.PrivacyPolicyVersion.Trim();

        // Verificar si ya fue aceptada esta versión
        var existingAcceptance = await _context.TermsAcceptances
            .FirstOrDefaultAsync(t => t.UserId == userId && t.TermsVersion == effectiveTermsVersion, cancellationToken);

        if (existingAcceptance != null)
        {
            return Result<LegalConsentResultDto>.Success(new LegalConsentResultDto(
                Success: true,
                Message: "Los Términos y Condiciones ya han sido aceptados previamente para esta versión.",
                AcceptedAt: existingAcceptance.AcceptedAt,
                IpAddress: existingAcceptance.IpAddress,
                UserEmail: user.Email,
                TermsVersion: existingAcceptance.TermsVersion
            ));
        }

        var effectiveIp = string.IsNullOrWhiteSpace(ipAddress) ? "127.0.0.1" : ipAddress.Trim();

        var acceptance = new TermsAcceptance(
            userId: user.Id,
            userEmail: user.Email,
            userName: user.FullName,
            userRole: user.Role.ToString(),
            termsVersion: effectiveTermsVersion,
            privacyPolicyVersion: effectivePrivacyVersion,
            ipAddress: effectiveIp,
            userAgent: userAgent
        );

        _context.TermsAcceptances.Add(acceptance);

        _context.AuditLogs.Add(new AuditLog(
            entityName: "LegalCompliance",
            action: "AcceptTermsAndConditions",
            details: $"Consentimiento expreso e inmutable registrado para T&C v{effectiveTermsVersion} y Política de Privacidad v{effectivePrivacyVersion} por {user.Email} (Rol: {user.Role}). IP: {effectiveIp}.",
            userName: user.FullName,
            userId: user.Id,
            entityId: user.Id.ToString(),
            ipAddress: effectiveIp
        ));

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Consentimiento legal registrado satisfactoriamente: Usuario {UserId} ({Email}) desde IP {Ip} para T&C v{Version}.",
            user.Id, user.Email, effectiveIp, effectiveTermsVersion);

        return Result<LegalConsentResultDto>.Success(new LegalConsentResultDto(
            Success: true,
            Message: "Consentimiento legal registrado exitosamente.",
            AcceptedAt: acceptance.AcceptedAt,
            IpAddress: acceptance.IpAddress,
            UserEmail: user.Email,
            TermsVersion: acceptance.TermsVersion
        ));
    }

    public Task<LegalDocumentsDto> GetDocumentsAsync(CancellationToken cancellationToken = default)
    {
        var termsContent = GetTermsAndConditionsText();
        var privacyContent = GetPrivacyPolicyText();

        return Task.FromResult(new LegalDocumentsDto(
            TermsVersion: CurrentTermsVersion,
            PrivacyVersion: CurrentPrivacyVersion,
            LastUpdated: CurrentLastUpdated,
            TermsTitle: "Términos y Condiciones de Uso del Software Insincro",
            TermsContent: termsContent,
            PrivacyTitle: "Política de Privacidad y Tratamiento de Datos Personales",
            PrivacyContent: privacyContent
        ));
    }

    public async Task<IReadOnlyList<TermsAcceptanceRecordDto>> GetAuditRecordsAsync(CancellationToken cancellationToken = default)
    {
        var records = await _context.TermsAcceptances
            .AsNoTracking()
            .OrderByDescending(t => t.AcceptedAt)
            .Select(t => new TermsAcceptanceRecordDto(
                t.Id,
                t.UserId,
                t.UserEmail,
                t.UserName,
                t.UserRole,
                t.TermsVersion,
                t.PrivacyPolicyVersion,
                t.AcceptedAt,
                t.IpAddress,
                t.UserAgent
            ))
            .ToListAsync(cancellationToken);

        return records;
    }

    private static string GetTermsAndConditionsText()
    {
        return """
# TÉRMINOS Y CONDICIONES DE USO DEL SOFTWARE CORPORATIVO INSINCRO
**Versión:** 1.0  
**Fecha de Vigencia:** 31 de Octubre de 2026  
**Especialidad:** Derecho Informático, Comercio Electrónico y Seguridad de la Información

---

### CLÁUSULA PRIMERA: NATURALEZA JURÍDICA Y ACEPTACIÓN VINCULANTE
El presente instrumento constituye un contrato electrónico vinculante (en adelante, los "Términos") suscrito entre la entidad titular de la plataforma **Insincro** y cualquier persona natural que acceda, opere o interactúe con el software en calidad de usuario administrador, operador de almacén o empleado (en adelante, el "Usuario").

La manifestación de consentimiento expreso a través de medios electrónicos mediante el marcado de la casilla de aceptación y la pulsación del botón correspondiente genera plenos efectos jurídicos, probatorios y obligacionales de conformidad con la legislación aplicable en materia de Mensajes de Datos, Comercio Electrónico y Firmas Digitales (Ley 527 de 1999 de Colombia, estándares UNCITRAL y normativas equivalentes en el ámbito iberoamericano e internacional).

---

### CLÁUSULA SEGUNDA: OBJETO Y ALCANCE DE LA LICENCIA DE USO
1. **Concesión de Licencia:** Insincro otorga al Usuario una licencia de uso limitada, no exclusiva, intransferible, temporal y estrictamente revocable para acceder a las funcionalidades del sistema destinadas a la gestión de inventarios, catálogo de productos, compras a proveedores, facturación y ventas, control de almacenes y analítica ejecutiva.
2. **Propiedad Intelectual:** Todos los derechos de propiedad intelectual e industrial sobre el software Insincro, incluyendo sin limitación su código fuente, arquitectura backend, diseño frontend, algoritmos de cálculo de Kardex, base de datos, marcas, logotipos y documentación técnica, pertenecen exclusivamente a sus titulares legales.
3. **Prohibición de Explotación no Autorizada:** Se prohíbe taxativamente la ingeniería inversa, descompilación, reproducción, sublicenciamiento, cesión no autorizada, o creación de obras derivadas a partir de cualquier elemento de la plataforma.

---

### CLÁUSULA TERCERA: CUSTODIA DE CREDENCIALES Y RESPONSABILIDAD PERSONAL
1. **Deber Estricto de Diligencia:** La cuenta de usuario es de uso personal e intransferible. El Usuario asume el deber indelegable de custodiar la confidencialidad de su contraseña y de las sesiones activas en sus dispositivos de trabajo.
2. **Imputabilidad de Acciones:** Cualquier transacción, modificación de existencias, orden de compra, emisión o anulación de comprobante de venta, y consulta de información realizada bajo las credenciales del Usuario se presumirá realizada directamente por este, asumiendo la responsabilidad disciplinaria, contractual, civil o penal que de ello se derive.
3. **Notificación de Vulneración:** El Usuario se obliga a notificar de forma inmediata a los administradores del sistema ante cualquier sospecha o evidencia de acceso no autorizado, extravío o filtración de sus credenciales.

---

### CLÁUSULA CUARTA: TRAZABILIDAD OPERATIVA Y AUDITORÍA FORENSE INMUTABLE
1. **Registro Permanente de Actividad:** El Usuario conoce y autoriza expresamente que el sistema Insincro cuenta con mecanismos de auditoría forense continua que registran de forma inmutable:
   - Dirección IP pública y local de origen de cada petición.
   - Fecha y hora exacta (UTC y huso horario local sincronizado).
   - Identificador de la cuenta de usuario, rol y almacén asignado.
   - Detalle exacto de la acción efectuada (ajustes de stock, recepciones de mercadería, precios de venta, descuentos y cancelaciones).
2. **Valor Probatorio:** Dichos registros informáticos gozan de presunción de autenticidad e integridad técnica y podrán ser aportados como prueba documental idónea en procesos administrativos, laborales o judiciales.

---

### CLÁUSULA QUINTA: PROHIBICIONES EXPRESAS Y SEGURIDAD INFORMÁTICA
Queda terminantemente prohibido al Usuario:
1. Extraer masivamente, mediante técnicas de "scraping", scripts automatizados o herramientas no autorizadas, las bases de datos de clientes, proveedores, costos de compra o márgenes de ganancia.
2. Realizar manipulaciones fraudulentas en el Kardex para ocultar pérdidas, faltantes o apropiación indebida de inventario.
3. Intentar eludir o vulnerar los controles de autenticación JWT, políticas de control de acceso basado en roles (RBAC) o cabeceras de seguridad.
4. Cualquier conducta tipificada en la legislación vigente sobre Delitos Informáticos y Protección de la Información.

---

### CLÁUSULA SEXTA: CONFIDENCIALIDAD COMERCIAL
Toda información comercial, listados de clientes, acuerdos con proveedores, precios de adquisición, estadísticas de ventas y proyecciones de stock accesibles a través de Insincro tienen el carácter de Secreto Empresarial y comercial reservado. El deber de confidencialidad subsistirá aún después de la finalización del vínculo laboral o comercial del Usuario.

---

### CLÁUSULA SÉPTIMA: DISPONIBILIDAD Y LIMITACIÓN DE RESPONSABILIDAD
Insincro se proporciona bajo estándares profesionales de disponibilidad, concurrencia y seguridad de datos. No obstante, no se asume responsabilidad por interrupciones extraordinarias derivadas de caídas generales de proveedores de telecomunicaciones o infraestructura de nube pública ajenos al control razonable del sistema.

---

### CLÁUSULA OCTAVA: MODIFICACIONES DE LOS TÉRMINOS
Cualquier actualización sustancial de estos Términos será comunicada a través de la plataforma y requerirá la aceptación previa del Usuario para continuar utilizando el servicio.
""";
    }

    private static string GetPrivacyPolicyText()
    {
        return """
# POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES Y PRIVACIDAD DE INSINCRO
**Versión:** 1.0  
**Fecha de Vigencia:** 31 de Octubre de 2026  
**Marco Legal:** Habeas Data (Ley 1581 de 2012), Reglamento General de Protección de Datos (RGPD/GDPR) y Estándares Internacionales de Privacidad

---

### 1. RESPONSABLE DEL TRATAMIENTO
La presente Política de Tratamiento de Datos Personales (en adelante, la "Política") regula la recolección, almacenamiento, uso, circulación y supresión de datos personales tratados a través de la plataforma de software **Insincro**.

---

### 2. PRINCIPIOS RECTORES APLICADOS AL TRATAMIENTO
Insincro aplica con estricto rigor los siguientes principios jurídicos en el procesamiento de datos:
- **Principio de Legalidad:** El tratamiento se sujeta estrictamente a las leyes vigentes de protección de datos.
- **Principio de Finalidad:** La recolección de datos responde exclusivamente a propósitos legítimos de gestión empresarial e inventario informados al titular.
- **Principio de Libertad y Consentimiento:** Los datos personales solo pueden ser tratados con el consentimiento previo, expreso e informado del titular.
- **Principio de Veracidad y Calidad:** La información debe ser veraz, completa, exacta, actualizada y comprobable.
- **Principio de Transparencia:** Se garantiza el derecho del titular a obtener en cualquier momento información sobre sus datos.
- **Principio de Seguridad:** Los datos se custodian bajo rigurosas medidas técnicas, humanas y administrativas para impedir su adulteración, pérdida, consulta o acceso no autorizado.
- **Principio de Confidencialidad:** Todas las personas que intervienen en el tratamiento están obligadas a garantizar la estricta reserva de los datos.

---

### 3. TIPOLOGÍA DE DATOS PERSONALES OBJETO DE RECOLECCIÓN
1. **Datos del Usuario del Software (Administradores y Empleados):**
   - Nombres y apellidos completos.
   - Dirección de correo electrónico corporativo.
   - Rol y permisos asignados dentro de la plataforma.
   - Hash criptográfico de contraseña (gestionado mediante algoritmo unidireccional seguro PBKDF2/SHA-256).
2. **Metadatos Técnicos y Registros de Auditoría:**
   - Dirección IP (Internet Protocol) pública o local de conexión y aceptación de términos.
   - Estampa temporal (Fecha y hora exacta en formato UTC con sincronización horaria).
   - Cadena de identificación de navegador y sistema operativo (User-Agent).
   - Tokens temporales de sesión almacenados en memoria volátil y cookies HTTP-Only seguras.
3. **Datos de Terceros Vinculados a la Operación (Clientes y Proveedores):**
   - Número de identificación tributaria o documento de identidad.
   - Razón social o nombres comerciales, teléfonos, domicilios y direcciones electrónicas comerciales.

---

### 4. FINALIDADES LEGÍTIMAS DEL TRATAMIENTO
Los datos recopilados serán tratados exclusivamente para:
1. Autenticar y validar la identidad de los operadores para habilitar su acceso al sistema Insincro.
2. Mantener la trazabilidad probatoria y auditoría de todas las operaciones comerciales (kardex, compras, ventas).
3. Registrar la evidencia de consentimiento y aceptación de las condiciones de uso de la plataforma.
4. Prevenir fraudes internos, accesos no autorizados y amenazas a la seguridad de la información.
5. Cumplir con deberes tributarios, contables, comerciales y laborales exigidos por la ley.

---

### 5. DERECHOS DE LOS TITULARES DE LA INFORMACIÓN (DERECHOS ARCO)
Todo titular de datos personales cuenta con las siguientes prerrogativas:
- **Conocer:** Acceder de forma gratuita a sus datos personales que hayan sido objeto de tratamiento.
- **Actualizar y Rectificar:** Solicitar la corrección de datos inexactos, incompletos o desactualizados.
- **Suprimir:** Solicitar la eliminación de sus datos cuando considere que no están siendo tratados conforme a la ley, salvo deber legal o contractual de permanencia en registros contables o de auditoría.
- **Revocar la Autorización:** Retirar el consentimiento otorgado, siempre que no medie una obligación legal de conservación.

---

### 6. MEDIDAS DE SEGURIDAD DE LA INFORMACIÓN
Insincro implementa controles técnicos avanzados:
- Cifrado en tránsito mediante protocolos criptográficos TLS/HTTPS.
- Almacenamiento seguro de contraseñas con salado criptográfico y factor de trabajo robusto.
- Separación de privilegios de acceso basada en roles (RBAC) y control por sucursal/almacén.
- Pistas de auditoría inmutables en base de datos protegidas contra borrado no autorizado.

---

### 7. CANALES PARA EL EJERCICIO DE DERECHOS
Para radicar consultas, reclamos o solicitudes de ejercicio de sus derechos de Habeas Data, el titular puede contactar al Administrador del Sistema o al Oficial de Privacidad a través de los canales institucionales dispuestos en la plataforma Insincro.
""";
    }
}

