using System.Net.Http.Headers;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient("BackendApi", client =>
{
    client.BaseAddress = new Uri("http://backend:8080");
}).ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
{
    UseCookies = false
});

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// Proxy inverso para peticiones /api hacia el contenedor backend
app.Map("/api/{**catch-all}", async (HttpContext context, IHttpClientFactory clientFactory) =>
{
    var client = clientFactory.CreateClient("BackendApi");
    var requestMessage = new HttpRequestMessage(new HttpMethod(context.Request.Method), $"{context.Request.Path}{context.Request.QueryString}");

    if (context.Request.ContentLength > 0)
    {
        requestMessage.Content = new StreamContent(context.Request.Body);
        if (context.Request.ContentType != null)
        {
            requestMessage.Content.Headers.ContentType = MediaTypeHeaderValue.Parse(context.Request.ContentType);
        }
    }

    foreach (var header in context.Request.Headers)
    {
        if (!header.Key.StartsWith(":") && header.Key != "Host")
        {
            requestMessage.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
        }
    }

    var response = await client.SendAsync(requestMessage, HttpCompletionOption.ResponseHeadersRead);
    context.Response.StatusCode = (int)response.StatusCode;

    foreach (var header in response.Headers)
    {
        if (header.Key.Equals("Set-Cookie", StringComparison.OrdinalIgnoreCase))
        {
            foreach (var val in header.Value)
            {
                context.Response.Headers.Append("Set-Cookie", val);
            }
        }
        else
        {
            context.Response.Headers[header.Key] = header.Value.ToArray();
        }
    }
    foreach (var header in response.Content.Headers)
    {
        context.Response.Headers[header.Key] = header.Value.ToArray();
    }
    context.Response.Headers.Remove("transfer-encoding");

    await response.Content.CopyToAsync(context.Response.Body);
});

app.MapFallbackToFile("index.html");

app.Run();
