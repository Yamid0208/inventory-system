using System.Text;
using Inventory.API.Middlewares;
using Inventory.Application;
using Inventory.Application.Common.Interfaces;
using Inventory.Infrastructure;
using Inventory.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Inyección de dependencias de capas
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// 2. Controladores, ProblemDetails y Rate Limiting
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("AuthLimiter", opt =>
    {
        opt.PermitLimit = 15;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 2;
    });
    options.AddFixedWindowLimiter("AiImportLimiter", opt =>
    {
        opt.PermitLimit = 10;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 2;
    });
});

// 3. Swagger con soporte para JWT Bearer
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Insincro API",
        Version = "v1",
        Description = "API RESTful Insincro - Clean Architecture, EF Core 8, Autenticación JWT y Auditoría Legal"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Ingrese 'Bearer' [espacio] seguido de su token JWT.\nEjemplo: \"Bearer eyJhbGciOi...\""
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// 4. Autenticación JWT y Autorización
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key no está configurada. Verifique las variables de entorno o configuración.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "InventoryManagementAPI";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "InventoryManagementApp";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// 5. Health Checks y Optimización de Rendimiento
builder.Services.AddHealthChecks();
builder.Services.AddMemoryCache();
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.BrotliCompressionProvider>();
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.GzipCompressionProvider>();
});

// 6. Configuración CORS con soporte para cookies y credenciales
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:4200" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// 1. Soporte para Reverse Proxy (Nginx en VPS Hostinger)
var forwardedOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
};
forwardedOptions.KnownNetworks.Clear();
forwardedOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedOptions);

// 2. Cabeceras HTTP de Seguridad (OWASP Hardening)
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "SAMEORIGIN");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("X-XSS-Protection", "0");
    context.Response.Headers.Append("Content-Security-Policy", 
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'none';");
    context.Response.Headers.Append("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    await next();
});

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

// 3. Manejo Global de Excepciones
app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Inventory Management API v1");
    });
}

// 4. Migraciones y sembrado inicial de datos
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    var db = services.GetRequiredService<ApplicationDbContext>();
    var passwordHasher = services.GetRequiredService<IPasswordHasher>();
    try
    {
        logger.LogInformation("Verificando la existencia de tablas en la base de datos...");
        var dbCreator = db.Database.GetService<Microsoft.EntityFrameworkCore.Storage.IRelationalDatabaseCreator>();
        bool hasTables = await dbCreator.HasTablesAsync();

        if (!hasTables)
        {
            logger.LogInformation("No se encontraron tablas. Creando esquema de tablas en la base de datos...");
            await dbCreator.CreateTablesAsync();
            logger.LogInformation("Esquema de tablas creado exitosamente.");
        }
        else
        {
            logger.LogInformation("Las tablas ya existen. Verificando integridad de esquemas...");
            try
            {
                if (db.Database.IsNpgsql())
                {
                    await db.Database.ExecuteSqlRawAsync(@"
                        CREATE TABLE IF NOT EXISTS ""SalePayments"" (
                            ""Id"" SERIAL PRIMARY KEY,
                            ""SaleId"" INTEGER NOT NULL,
                            ""Method"" INTEGER NOT NULL,
                            ""Amount"" NUMERIC(18,2) NOT NULL,
                            ""Reference"" VARCHAR(100) NULL,
                            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL,
                            ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                            ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE,
                            ""DeletedAt"" TIMESTAMP WITH TIME ZONE NULL,
                            CONSTRAINT ""FK_SalePayments_Sales_SaleId"" FOREIGN KEY (""SaleId"") REFERENCES ""Sales"" (""Id"") ON DELETE CASCADE
                        );
                        CREATE INDEX IF NOT EXISTS ""IX_SalePayments_SaleId"" ON ""SalePayments"" (""SaleId"");
                        ALTER TABLE ""SalePayments"" ADD COLUMN IF NOT EXISTS ""DeletedAt"" TIMESTAMP WITH TIME ZONE NULL;

                        CREATE TABLE IF NOT EXISTS ""TermsAcceptances"" (
                            ""Id"" SERIAL PRIMARY KEY,
                            ""UserId"" INTEGER NOT NULL,
                            ""UserEmail"" VARCHAR(256) NOT NULL,
                            ""UserName"" VARCHAR(150) NOT NULL,
                            ""UserRole"" VARCHAR(50) NOT NULL,
                            ""TermsVersion"" VARCHAR(20) NOT NULL,
                            ""PrivacyPolicyVersion"" VARCHAR(20) NOT NULL,
                            ""AcceptedAt"" TIMESTAMP WITH TIME ZONE NOT NULL,
                            ""IpAddress"" VARCHAR(64) NOT NULL,
                            ""UserAgent"" VARCHAR(512) NULL,
                            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL,
                            ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                            ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE,
                            ""DeletedAt"" TIMESTAMP WITH TIME ZONE NULL,
                            CONSTRAINT ""FK_TermsAcceptances_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
                        );
                        CREATE INDEX IF NOT EXISTS ""IX_TermsAcceptances_UserId"" ON ""TermsAcceptances"" (""UserId"");
                        CREATE INDEX IF NOT EXISTS ""IX_TermsAcceptances_AcceptedAt"" ON ""TermsAcceptances"" (""AcceptedAt"");
                        CREATE INDEX IF NOT EXISTS ""IX_TermsAcceptances_UserId_TermsVersion"" ON ""TermsAcceptances"" (""UserId"", ""TermsVersion"");

                        DO $$
                        BEGIN
                            BEGIN
                                ALTER TABLE ""Products"" ALTER COLUMN ""RowVersion"" SET DEFAULT decode(md5(random()::text || clock_timestamp()::text), 'hex');
                            EXCEPTION WHEN OTHERS THEN
                                NULL;
                            END;
                        END $$;
                    ");
                }
                else if (db.Database.IsSqlServer())
                {
                    await db.Database.ExecuteSqlRawAsync(@"
                        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SalePayments]') AND type in (N'U'))
                        BEGIN
                            CREATE TABLE [dbo].[SalePayments] (
                                [Id] int IDENTITY(1,1) NOT NULL,
                                [SaleId] int NOT NULL,
                                [Method] int NOT NULL,
                                [Amount] decimal(18,2) NOT NULL,
                                [Reference] nvarchar(100) NULL,
                                [CreatedAt] datetime2 NOT NULL,
                                [UpdatedAt] datetime2 NULL,
                                [IsDeleted] bit NOT NULL DEFAULT 0,
                                [DeletedAt] datetimeoffset NULL,
                                CONSTRAINT [PK_SalePayments] PRIMARY KEY ([Id]),
                                CONSTRAINT [FK_SalePayments_Sales_SaleId] FOREIGN KEY ([SaleId]) REFERENCES [dbo].[Sales] ([Id]) ON DELETE CASCADE
                            );
                            CREATE NONCLUSTERED INDEX [IX_SalePayments_SaleId] ON [dbo].[SalePayments]([SaleId]);
                        END
                        ELSE
                        BEGIN
                            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[SalePayments]') AND name = 'DeletedAt')
                            BEGIN
                                ALTER TABLE [dbo].[SalePayments] ADD [DeletedAt] datetimeoffset NULL;
                            END
                        END

                        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TermsAcceptances]') AND type in (N'U'))
                        BEGIN
                            CREATE TABLE [dbo].[TermsAcceptances] (
                                [Id] int IDENTITY(1,1) NOT NULL,
                                [UserId] int NOT NULL,
                                [UserEmail] nvarchar(256) NOT NULL,
                                [UserName] nvarchar(150) NOT NULL,
                                [UserRole] nvarchar(50) NOT NULL,
                                [TermsVersion] nvarchar(20) NOT NULL,
                                [PrivacyPolicyVersion] nvarchar(20) NOT NULL,
                                [AcceptedAt] datetimeoffset NOT NULL,
                                [IpAddress] nvarchar(64) NOT NULL,
                                [UserAgent] nvarchar(512) NULL,
                                [CreatedAt] datetimeoffset NOT NULL,
                                [UpdatedAt] datetimeoffset NULL,
                                [IsDeleted] bit NOT NULL DEFAULT 0,
                                [DeletedAt] datetimeoffset NULL,
                                CONSTRAINT [PK_TermsAcceptances] PRIMARY KEY ([Id]),
                                CONSTRAINT [FK_TermsAcceptances_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
                            );
                            CREATE NONCLUSTERED INDEX [IX_TermsAcceptances_UserId] ON [dbo].[TermsAcceptances]([UserId]);
                            CREATE NONCLUSTERED INDEX [IX_TermsAcceptances_AcceptedAt] ON [dbo].[TermsAcceptances]([AcceptedAt]);
                            CREATE NONCLUSTERED INDEX [IX_TermsAcceptances_UserId_TermsVersion] ON [dbo].[TermsAcceptances]([UserId], [TermsVersion]);
                        END
                    ");
                }
            }
            catch (Exception schemaEx)
            {
                logger.LogWarning(schemaEx, "Verificación de esquema SalePayments: {Msg}", schemaEx.Message);
            }
        }

        await DatabaseSeeder.SeedInitialDataAsync(db, passwordHasher, logger, builder.Configuration, app.Environment.IsDevelopment());
        logger.LogInformation("Verificación de datos iniciales completada con éxito.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error crítico al inicializar la base de datos: {Message}", ex.Message);
    }
}

app.UseResponseCompression();
app.UseCors("CorsPolicy");

// Servir estáticos de uploads de forma segura
var uploadPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
if (!Directory.Exists(uploadPath))
{
    Directory.CreateDirectory(uploadPath);
}

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadPath),
    RequestPath = "/uploads"
});

app.UseRouting();
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

// Health check endpoints
app.MapHealthChecks("/healthz");

app.MapControllers();

app.Run();
