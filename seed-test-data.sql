-- ============================================================================
-- SCRIPT DE GENERACIÓN DE DATOS DE PRUEBA: EMPLEADOS, CLIENTES Y VENTAS
-- INSINCRO POS / ANALÍTICA EMPRESARIAL
-- ============================================================================

SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

-- 1. CREACIÓN DE CLIENTES
PRINT '1. Insertando Clientes...';

MERGE INTO Customers AS target
USING (VALUES
    ('Industrias Metálicas del Caribe S.A.S.', '901458923-1', 'compras@metalicascaribe.co', '3001234567', 'Calle 72 # 54-20', 'Barranquilla', 1),
    ('Distribuidora Ferretera La 14', '800234190-4', 'contacto@ferreteriala14.com', '3109876543', 'Av. 6N # 28-15', 'Cali', 1),
    ('Construcciones & Diseños Andinos', '900987654-2', 'gerencia@construandinos.com', '3205551234', 'Carrera 15 # 93-45', 'Bogotá', 1),
    ('Automotriz Valledupar S.A.', '890123789-5', 'repuestos@autovalledupar.com', '3157778899', 'Calle 16 # 19-30', 'Valledupar', 1),
    ('Alejandro Restrepo Ramírez', '1020304050', 'alejandro.restrepo@gmail.com', '3014445566', 'Circular 4 # 73-10', 'Medellín', 1),
    ('Mariana Salazar Henao', '1030405060', 'mariana.salazar@outlook.com', '3182223344', 'Carrera 27 # 45-12', 'Bucaramanga', 1),
    ('Carlos Mario Quintero', '71234567', 'carlos.quintero@hotmail.com', '3126667788', 'Av. Circunvalar # 12-40', 'Pereira', 1),
    ('Soluciones de Ingeniería SAS', '901234567-8', 'pagos@solucionesing.com', '3009990011', 'Bocagrande Carrera 3', 'Cartagena', 1)
) AS source (Name, TaxId, Email, Phone, Address, City, IsActive)
ON target.TaxId = source.TaxId
WHEN NOT MATCHED THEN
    INSERT (Name, TaxId, Email, Phone, Address, City, IsActive, CreatedAt, IsDeleted)
    VALUES (source.Name, source.TaxId, source.Email, source.Phone, source.Address, source.City, source.IsActive, SYSDATETIMEOFFSET(), 0);

-- 2. CREACIÓN DE EMPLEADOS / VENDEDORES
PRINT '2. Insertando Empleados / Vendedores...';

DECLARE @DefaultPasswordHash NVARCHAR(MAX) = 'FptaKHIRBf1sNo6OZkYRvV5IJDVm53q/23xnvpMKrb/kzWLtArpBM0on25gK6Cuo'; -- Admin123*

MERGE INTO Users AS target
USING (VALUES
    -- Empleados para Sede 1002 (Bosconia / Casa del Remate)
    ('Valentina Ospina Gómez', 'valentina.ventas@sgi.local', @DefaultPasswordHash, 'Seller', 1, 1002),
    ('Mateo Echeverry Ríos', 'mateo.cajero@sgi.local', @DefaultPasswordHash, 'Seller', 1, 1002),
    ('Lucía Fernández Soto', 'lucia.asesora@sgi.local', @DefaultPasswordHash, 'Seller', 1, 1002),
    -- Empleados para Sede 1 (Sede Principal Norte)
    ('Camila Morales Rojas', 'camila.ventas@sgi.local', @DefaultPasswordHash, 'Seller', 1, 1),
    ('Andrés Felipe Castro', 'andres.pos@sgi.local', @DefaultPasswordHash, 'Seller', 1, 1),
    ('Daniela Restrepo Londoño', 'daniela.mostrador@sgi.local', @DefaultPasswordHash, 'Seller', 1, 1)
) AS source (FullName, Email, PasswordHash, Role, IsActive, WarehouseId)
ON target.Email = source.Email
WHEN NOT MATCHED THEN
    INSERT (FullName, Email, PasswordHash, Role, IsActive, WarehouseId, CreatedAt, IsDeleted)
    VALUES (source.FullName, source.Email, source.PasswordHash, source.Role, source.IsActive, source.WarehouseId, SYSDATETIMEOFFSET(), 0);

-- 3. RECUPERAR IDS PARA GENERAR VENTAS
DECLARE @UserValId INT = (SELECT TOP 1 Id FROM Users WHERE Email = 'valentina.ventas@sgi.local');
DECLARE @UserMatId INT = (SELECT TOP 1 Id FROM Users WHERE Email = 'mateo.cajero@sgi.local');
DECLARE @UserLucId INT = (SELECT TOP 1 Id FROM Users WHERE Email = 'lucia.asesora@sgi.local');
DECLARE @UserCamId INT = (SELECT TOP 1 Id FROM Users WHERE Email = 'camila.ventas@sgi.local');
DECLARE @UserAndId INT = (SELECT TOP 1 Id FROM Users WHERE Email = 'andres.pos@sgi.local');
DECLARE @UserDanId INT = (SELECT TOP 1 Id FROM Users WHERE Email = 'daniela.mostrador@sgi.local');

-- Admin usuarios si faltan
IF @UserValId IS NULL SET @UserValId = 12;
IF @UserMatId IS NULL SET @UserMatId = 12;
IF @UserLucId IS NULL SET @UserLucId = 12;
IF @UserCamId IS NULL SET @UserCamId = 1;
IF @UserAndId IS NULL SET @UserAndId = 1;
IF @UserDanId IS NULL SET @UserDanId = 1;

PRINT '3. Insertando Ventas Estratégicas para ambas Sedes (1002 y 1)...';

-- Tabla temporal para armar el lote de ventas
IF OBJECT_ID('tempdb..#SeedSales') IS NOT NULL DROP TABLE #SeedSales;
CREATE TABLE #SeedSales (
    TempId INT IDENTITY(1,1) PRIMARY KEY,
    SaleNumber NVARCHAR(50),
    CustomerName NVARCHAR(200),
    CustomerTaxId NVARCHAR(50),
    CustomerEmail NVARCHAR(100),
    UserId INT,
    WarehouseId INT,
    SaleDate DATETIMEOFFSET,
    PaymentMethod TINYINT,
    Status TINYINT,
    Subtotal DECIMAL(18,2),
    Tax DECIMAL(18,2),
    Total DECIMAL(18,2),
    Prod1Id INT, Prod1Qty INT, Prod1Price DECIMAL(18,2),
    Prod2Id INT, Prod2Qty INT, Prod2Price DECIMAL(18,2)
);

-- =============================================================================
-- LOTES PARA SEDE 1002 (Bosconia)
-- =============================================================================
-- Hoy: 2026-11-03
INSERT INTO #SeedSales VALUES
('VEN-20261103-1001', 'Industrias Metálicas del Caribe S.A.S.', '901458923-1', 'compras@metalicascaribe.co', @UserValId, 1002, '2026-11-03 09:15:00 +00:00', 1, 2, 450000.00, 85500.00, 535500.00, 4014, 2, 165000.00, 4005, 1, 95000.00),
('VEN-20261103-1002', 'Alejandro Restrepo Ramírez', '1020304050', 'alejandro.restrepo@gmail.com', @UserMatId, 1002, '2026-11-03 11:30:00 +00:00', 5, 2, 170000.00, 32300.00, 202300.00, 4011, 1, 170000.00, NULL, 0, 0),
('VEN-20261103-1003', 'Construcciones & Diseños Andinos', '900987654-2', 'gerencia@construandinos.com', @UserLucId, 1002, '2026-11-03 15:45:00 +00:00', 3, 2, 680000.00, 129200.00, 809200.00, 4004, 2, 220000.00, 4006, 2, 125000.00),
('VEN-20261103-1004', 'Mariana Salazar Henao', '1030405060', 'mariana.salazar@outlook.com', @UserValId, 1002, '2026-11-03 18:20:00 +00:00', 2, 2, 3500000.00, 665000.00, 4165000.00, 1003, 1, 3500000.00, NULL, 0, 0),
('VEN-20261103-1005', 'Carlos Mario Quintero', '71234567', 'carlos.quintero@hotmail.com', @UserMatId, 1002, '2026-11-03 19:10:00 +00:00', 8, 2, 260000.00, 49400.00, 309400.00, 4015, 5, 52000.00, NULL, 0, 0);

-- Ayer: 2026-11-02
INSERT INTO #SeedSales VALUES
('VEN-20261102-1001', 'Distribuidora Ferretera La 14', '800234190-4', 'contacto@ferreteriala14.com', @UserValId, 1002, '2026-11-02 10:20:00 +00:00', 7, 2, 490000.00, 93100.00, 583100.00, 4014, 2, 165000.00, 4011, 1, 170000.00),
('VEN-20261102-1002', 'Automotriz Valledupar S.A.', '890123789-5', 'repuestos@autovalledupar.com', @UserLucId, 1002, '2026-11-02 14:15:00 +00:00', 3, 2, 2000000.00, 380000.00, 2380000.00, 2003, 1, 2000000.00, NULL, 0, 0),
('VEN-20261102-1003', 'Soluciones de Ingeniería SAS', '901234567-8', 'pagos@solucionesing.com', @UserMatId, 1002, '2026-11-02 17:50:00 +00:00', 6, 2, 380000.00, 72200.00, 452200.00, 4005, 4, 95000.00, NULL, 0, 0);

-- Últimos 7 días: 2026-10-29 a 2026-10-31
INSERT INTO #SeedSales VALUES
('VEN-20261031-1001', 'Alejandro Restrepo Ramírez', '1020304050', 'alejandro.restrepo@gmail.com', @UserValId, 1002, '2026-10-31 16:30:00 +00:00', 1, 2, 250000.00, 47500.00, 297500.00, 4006, 2, 125000.00, NULL, 0, 0),
('VEN-20261030-1001', 'Industrias Metálicas del Caribe S.A.S.', '901458923-1', 'compras@metalicascaribe.co', @UserLucId, 1002, '2026-10-30 11:10:00 +00:00', 3, 2, 520000.00, 98800.00, 618800.00, 4009, 1, 520000.00, NULL, 0, 0),
('VEN-20261029-1001', 'Mariana Salazar Henao', '1030405060', 'mariana.salazar@outlook.com', @UserMatId, 1002, '2026-10-29 18:40:00 +00:00', 2, 2, 330000.00, 62700.00, 392700.00, 4014, 2, 165000.00, NULL, 0, 0);

-- Mes Anterior (Octubre histórico comparativo): 2026-10-05 a 2026-10-25
INSERT INTO #SeedSales VALUES
('VEN-20261005-1001', 'Construcciones & Diseños Andinos', '900987654-2', 'gerencia@construandinos.com', @UserValId, 1002, '2026-10-05 10:00:00 +00:00', 1, 2, 1500000.00, 285000.00, 1785000.00, 2004, 1, 1500000.00, NULL, 0, 0),
('VEN-20261012-1001', 'Automotriz Valledupar S.A.', '890123789-5', 'repuestos@autovalledupar.com', @UserMatId, 1002, '2026-10-12 15:30:00 +00:00', 3, 2, 680000.00, 129200.00, 809200.00, 4004, 2, 220000.00, 4007, 1, 68000.00),
('VEN-20261018-1001', 'Distribuidora Ferretera La 14', '800234190-4', 'contacto@ferreteriala14.com', @UserLucId, 1002, '2026-10-18 12:15:00 +00:00', 7, 2, 475000.00, 90250.00, 565250.00, 4005, 5, 95000.00, NULL, 0, 0),
('VEN-20261025-1001', 'Soluciones de Ingeniería SAS', '901234567-8', 'pagos@solucionesing.com', @UserValId, 1002, '2026-10-25 17:00:00 +00:00', 8, 2, 700000.00, 133000.00, 833000.00, 4011, 2, 170000.00, 4014, 2, 165000.00);

-- =============================================================================
-- LOTES PARA SEDE 1 (Sede Principal Norte)
-- =============================================================================
-- Hoy: 2026-11-03
INSERT INTO #SeedSales VALUES
('VEN-20261103-2001', 'Construcciones & Diseños Andinos', '900987654-2', 'gerencia@construandinos.com', @UserCamId, 1, '2026-11-03 09:40:00 +00:00', 1, 2, 600000.00, 114000.00, 714000.00, 1, 4, 150000.00, NULL, 0, 0),
('VEN-20261103-2002', 'Alejandro Restrepo Ramírez', '1020304050', 'alejandro.restrepo@gmail.com', @UserAndId, 1, '2026-11-03 11:50:00 +00:00', 5, 2, 330000.00, 62700.00, 392700.00, 4014, 2, 165000.00, NULL, 0, 0),
('VEN-20261103-2003', 'Industrias Metálicas del Caribe S.A.S.', '901458923-1', 'compras@metalicascaribe.co', @UserDanId, 1, '2026-11-03 16:10:00 +00:00', 3, 2, 1040000.00, 197600.00, 1237600.00, 4009, 2, 520000.00, NULL, 0, 0),
('VEN-20261103-2004', 'Carlos Mario Quintero', '71234567', 'carlos.quintero@hotmail.com', @UserCamId, 1, '2026-11-03 18:50:00 +00:00', 2, 2, 440000.00, 83600.00, 523600.00, 4004, 2, 220000.00, NULL, 0, 0);

-- Ayer: 2026-11-02
INSERT INTO #SeedSales VALUES
('VEN-20261102-2001', 'Mariana Salazar Henao', '1030405060', 'mariana.salazar@outlook.com', @UserAndId, 1, '2026-11-02 10:30:00 +00:00', 7, 2, 510000.00, 96900.00, 606900.00, 4011, 3, 170000.00, NULL, 0, 0),
('VEN-20261102-2002', 'Automotriz Valledupar S.A.', '890123789-5', 'repuestos@autovalledupar.com', @UserDanId, 1, '2026-11-02 15:00:00 +00:00', 1, 2, 380000.00, 72200.00, 452200.00, 4005, 4, 95000.00, NULL, 0, 0);

-- Octubre histórico Sede 1
INSERT INTO #SeedSales VALUES
('VEN-20261010-2001', 'Soluciones de Ingeniería SAS', '901234567-8', 'pagos@solucionesing.com', @UserCamId, 1, '2026-10-10 11:00:00 +00:00', 3, 2, 2000000.00, 380000.00, 2380000.00, 2003, 1, 2000000.00, NULL, 0, 0),
('VEN-20261020-2001', 'Distribuidora Ferretera La 14', '800234190-4', 'contacto@ferreteriala14.com', @UserAndId, 1, '2026-10-20 16:00:00 +00:00', 8, 2, 850000.00, 161500.00, 1011500.00, 4011, 5, 170000.00, NULL, 0, 0);

-- Insertar Ventas, Detalles y Pagos iterativamente
DECLARE @CurTempId INT, @MaxTempId INT;
SELECT @CurTempId = MIN(TempId), @MaxTempId = MAX(TempId) FROM #SeedSales;

WHILE @CurTempId <= @MaxTempId
BEGIN
    DECLARE @SaleNum NVARCHAR(50), @CustName NVARCHAR(200), @CustTax NVARCHAR(50), @CustMail NVARCHAR(100);
    DECLARE @UId INT, @WId INT, @SDate DATETIMEOFFSET, @PMethod TINYINT, @Stat TINYINT;
    DECLARE @SubTot DECIMAL(18,2), @TaxTot DECIMAL(18,2), @Tot DECIMAL(18,2);
    DECLARE @P1Id INT, @P1Qty INT, @P1Price DECIMAL(18,2);
    DECLARE @P2Id INT, @P2Qty INT, @P2Price DECIMAL(18,2);

    SELECT 
        @SaleNum = SaleNumber, @CustName = CustomerName, @CustTax = CustomerTaxId, @CustMail = CustomerEmail,
        @UId = UserId, @WId = WarehouseId, @SDate = SaleDate, @PMethod = PaymentMethod, @Stat = Status,
        @SubTot = Subtotal, @TaxTot = Tax, @Tot = Total,
        @P1Id = Prod1Id, @P1Qty = Prod1Qty, @P1Price = Prod1Price,
        @P2Id = Prod2Id, @P2Qty = Prod2Qty, @P2Price = Prod2Price
    FROM #SeedSales WHERE TempId = @CurTempId;

    -- Solo insertar si no existe el número de venta
    IF NOT EXISTS (SELECT 1 FROM Sales WHERE SaleNumber = @SaleNum)
    BEGIN
        INSERT INTO Sales (
            SaleNumber, CustomerName, CustomerTaxId, CustomerEmail, 
            UserId, WarehouseId, SaleDate, Status, PaymentMethod, 
            Subtotal, Tax, Total, InvoiceType, CreatedAt, IsDeleted
        ) VALUES (
            @SaleNum, @CustName, @CustTax, @CustMail,
            @UId, @WId, @SDate, @Stat, @PMethod,
            @SubTot, @TaxTot, @Tot, 1, @SDate, 0
        );

        DECLARE @NewSaleId INT = SCOPE_IDENTITY();

        -- Ítem 1
        IF @P1Id IS NOT NULL AND @P1Qty > 0
        BEGIN
            INSERT INTO SaleItems (SaleId, ProductId, Quantity, UnitPrice, Subtotal, Tax, Total, CreatedAt, IsDeleted)
            VALUES (@NewSaleId, @P1Id, @P1Qty, @P1Price, @P1Qty * @P1Price, (@P1Qty * @P1Price) * 0.19, (@P1Qty * @P1Price) * 1.19, @SDate, 0);
        END

        -- Ítem 2
        IF @P2Id IS NOT NULL AND @P2Qty > 0
        BEGIN
            INSERT INTO SaleItems (SaleId, ProductId, Quantity, UnitPrice, Subtotal, Tax, Total, CreatedAt, IsDeleted)
            VALUES (@NewSaleId, @P2Id, @P2Qty, @P2Price, @P2Qty * @P2Price, (@P2Qty * @P2Price) * 0.19, (@P2Qty * @P2Price) * 1.19, @SDate, 0);
        END

        -- Registro de Pago
        IF @PMethod = 8 -- Mixto: mitades
        BEGIN
            INSERT INTO SalePayments (SaleId, Method, Amount, Reference, CreatedAt, IsDeleted)
            VALUES (@NewSaleId, 1, @Tot / 2.0, 'Efectivo parte 1', @SDate, 0);
            INSERT INTO SalePayments (SaleId, Method, Amount, Reference, CreatedAt, IsDeleted)
            VALUES (@NewSaleId, 7, @Tot / 2.0, 'Tarjeta Débito parte 2', @SDate, 0);
        END
        ELSE
        BEGIN
            INSERT INTO SalePayments (SaleId, Method, Amount, Reference, CreatedAt, IsDeleted)
            VALUES (@NewSaleId, @PMethod, @Tot, NULL, @SDate, 0);
        END
    END

    SET @CurTempId = @CurTempId + 1;
END

DROP TABLE #SeedSales;

PRINT '¡Sembrado de datos finalizado exitosamente!';
