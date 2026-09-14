using System.Net;
using System.Text.Json;
using Inventory.Application.Common.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Middlewares;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Excepción capturada en GlobalExceptionMiddleware: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/problem+json";

        var problemDetails = new ProblemDetails
        {
            Instance = context.Request.Path,
            Extensions = { ["traceId"] = context.TraceIdentifier }
        };

        switch (exception)
        {
            case ValidationException valEx:
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                problemDetails.Status = (int)HttpStatusCode.BadRequest;
                problemDetails.Title = "Error de validación";
                problemDetails.Detail = valEx.Message;
                problemDetails.Extensions["errors"] = valEx.Errors;
                break;

            case NotFoundException notFoundEx:
                context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                problemDetails.Status = (int)HttpStatusCode.NotFound;
                problemDetails.Title = "Recurso no encontrado";
                problemDetails.Detail = notFoundEx.Message;
                break;

            case ConflictException conflictEx:
                context.Response.StatusCode = (int)HttpStatusCode.Conflict;
                problemDetails.Status = (int)HttpStatusCode.Conflict;
                problemDetails.Title = "Conflicto de recursos";
                problemDetails.Detail = conflictEx.Message;
                break;

            case BusinessRuleViolationException ruleEx:
                context.Response.StatusCode = (int)HttpStatusCode.UnprocessableEntity;
                problemDetails.Status = (int)HttpStatusCode.UnprocessableEntity;
                problemDetails.Title = $"Regla de negocio no satisfecha ({ruleEx.RuleCode})";
                problemDetails.Detail = ruleEx.Message;
                problemDetails.Extensions["ruleCode"] = ruleEx.RuleCode;
                break;

            case ArgumentException or InvalidOperationException:
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                problemDetails.Status = (int)HttpStatusCode.BadRequest;
                problemDetails.Title = "Solicitud inválida";
                problemDetails.Detail = exception.Message;
                break;

            default:
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                problemDetails.Status = (int)HttpStatusCode.InternalServerError;
                problemDetails.Title = "Error interno del servidor";
                problemDetails.Detail = $"{exception.Message}{(exception.InnerException != null ? " | " + exception.InnerException.Message : "")}";
                break;
        }

        var json = JsonSerializer.Serialize(problemDetails);
        await context.Response.WriteAsync(json);
    }
}

