using System.Text;
using Inventory.API.Middlewares;
using Inventory.Application;
using Inventory.Application.Common.Interfaces;
using Inventory.Infrastructure;
using Inventory.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Inyección de dependencias de capas
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// 2. Controladores y ProblemDetails
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();

// 3. Swagger con soporte para JWT Bearer
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Sistema de Gestión de Inventario API",
        Version = "v1",
        Description = "API RESTful con Clean Architecture, EF Core 8 y Autenticación JWT"
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
var jwtKey = builder.Configuration["Jwt:Key"] ?? "SUPER_SECRET_INVENTORY_MANAGEMENT_KEY_2026_DEV_ENVIRONMENT_987654321";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "InventoryManagementAPI";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "InventoryManagementApp";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
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

// Middleware Pipeline
app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Inventory Management API v1");
    });
}

// Migraciones y sembrado inicial de datos (ahora en todos los entornos)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    var db = services.GetRequiredService<ApplicationDbContext>();
    var passwordHasher = services.GetRequiredService<IPasswordHasher>();
    try
    {
        logger.LogInformation("Verificando la existencia de tablas en la base de datos PostgreSQL...");
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
                    ");
                }
            }
            catch (Exception schemaEx)
            {
                logger.LogWarning(schemaEx, "Verificación de esquema SalePayments: {Msg}", schemaEx.Message);
            }
        }

        await DatabaseSeeder.SeedInitialDataAsync(db, passwordHasher, logger);
        logger.LogInformation("Sembrado de datos iniciales completado con éxito.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error crítico al inicializar la base de datos PostgreSQL: {Message}", ex.Message);
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

app.UseAuthentication();
app.UseAuthorization();

// Health check endpoints
app.MapHealthChecks("/healthz");

app.MapControllers();

app.Run();
