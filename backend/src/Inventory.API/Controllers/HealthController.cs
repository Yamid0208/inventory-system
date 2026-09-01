using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

public class HealthController : BaseApiController
{
    [HttpGet]
    public IActionResult Ping()
    {
        return Ok(new
        {
            status = "Healthy",
            timestamp = DateTimeOffset.UtcNow,
            service = "Inventory Management API",
            version = "1.0.0"
        });
    }
}
