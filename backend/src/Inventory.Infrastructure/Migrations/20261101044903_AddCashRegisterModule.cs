using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inventory.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCashRegisterModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<byte[]>(
                name: "RowVersion",
                table: "Products",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                oldClrType: typeof(byte[]),
                oldType: "varbinary(max)");

            migrationBuilder.CreateTable(
                name: "CashRegisterSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SessionNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    WarehouseId = table.Column<int>(type: "int", nullable: true),
                    OpenedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ClosedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Status = table.Column<byte>(type: "tinyint", nullable: false),
                    InitialCash = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    OpeningNotes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ClosingNotes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ExpectedCash = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ActualCash = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    CashDifference = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    DifferenceStatus = table.Column<byte>(type: "tinyint", nullable: true),
                    TotalCashInflow = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalCashOutflow = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalTransferInflow = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalCardInflow = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalOtherInflow = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalSales = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CashRegisterSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CashRegisterSessions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CashRegisterSessions_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TermsAcceptances",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    UserEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    UserName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    UserRole = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TermsVersion = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PrivacyPolicyVersion = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    AcceptedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    UserAgent = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TermsAcceptances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TermsAcceptances_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CashRegisterMovements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CashRegisterSessionId = table.Column<int>(type: "int", nullable: false),
                    MovementNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    MovementType = table.Column<byte>(type: "tinyint", nullable: false),
                    Category = table.Column<byte>(type: "tinyint", nullable: false),
                    PaymentMethod = table.Column<byte>(type: "tinyint", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Concept = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    MovementDate = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    SaleId = table.Column<int>(type: "int", nullable: true),
                    IsCashEffect = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CashRegisterMovements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CashRegisterMovements_CashRegisterSessions_CashRegisterSessionId",
                        column: x => x.CashRegisterSessionId,
                        principalTable: "CashRegisterSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CashRegisterMovements_Sales_SaleId",
                        column: x => x.SaleId,
                        principalTable: "Sales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CashRegisterMovements_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Sales_WarehouseId",
                table: "Sales",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_CashRegisterMovements_SaleId",
                table: "CashRegisterMovements",
                column: "SaleId");

            migrationBuilder.CreateIndex(
                name: "IX_CashRegisterMovements_Session_Date",
                table: "CashRegisterMovements",
                columns: new[] { "CashRegisterSessionId", "MovementDate" });

            migrationBuilder.CreateIndex(
                name: "IX_CashRegisterMovements_UserId",
                table: "CashRegisterMovements",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "UX_CashRegisterMovements_MovementNumber",
                table: "CashRegisterMovements",
                column: "MovementNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CashRegisterSessions_OpenedAt",
                table: "CashRegisterSessions",
                column: "OpenedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CashRegisterSessions_UserId_Status",
                table: "CashRegisterSessions",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_CashRegisterSessions_WarehouseId",
                table: "CashRegisterSessions",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "UX_CashRegisterSessions_SessionNumber",
                table: "CashRegisterSessions",
                column: "SessionNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TermsAcceptances_AcceptedAt",
                table: "TermsAcceptances",
                column: "AcceptedAt");

            migrationBuilder.CreateIndex(
                name: "IX_TermsAcceptances_UserId",
                table: "TermsAcceptances",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TermsAcceptances_UserId_TermsVersion",
                table: "TermsAcceptances",
                columns: new[] { "UserId", "TermsVersion" });

            migrationBuilder.AddForeignKey(
                name: "FK_Sales_Warehouses_WarehouseId",
                table: "Sales",
                column: "WarehouseId",
                principalTable: "Warehouses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Sales_Warehouses_WarehouseId",
                table: "Sales");

            migrationBuilder.DropTable(
                name: "CashRegisterMovements");

            migrationBuilder.DropTable(
                name: "TermsAcceptances");

            migrationBuilder.DropTable(
                name: "CashRegisterSessions");

            migrationBuilder.DropIndex(
                name: "IX_Sales_WarehouseId",
                table: "Sales");

            migrationBuilder.AlterColumn<byte[]>(
                name: "RowVersion",
                table: "Products",
                type: "varbinary(max)",
                nullable: false,
                oldClrType: typeof(byte[]),
                oldType: "rowversion",
                oldRowVersion: true);
        }
    }
}
