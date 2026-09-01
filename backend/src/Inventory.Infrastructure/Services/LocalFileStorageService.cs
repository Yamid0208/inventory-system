using Inventory.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;

namespace Inventory.Infrastructure.Services;

public class LocalFileStorageService : IFileStorageService
{
    private readonly string _baseUploadPath;
    private static readonly Dictionary<string, byte[]> MagicNumbers = new()
    {
        { "jpg", new byte[] { 0xFF, 0xD8, 0xFF } },
        { "jpeg", new byte[] { 0xFF, 0xD8, 0xFF } },
        { "png", new byte[] { 0x89, 0x50, 0x4E, 0x47 } },
        { "webp", new byte[] { 0x52, 0x49, 0x46, 0x46 } }
    };

    public LocalFileStorageService(IConfiguration configuration)
    {
        _baseUploadPath = configuration["FileStorage:BasePath"] ?? Path.Combine(Directory.GetCurrentDirectory(), "uploads");
        if (!Directory.Exists(_baseUploadPath))
        {
            Directory.CreateDirectory(_baseUploadPath);
        }
    }

    public async Task<string> SaveFileAsync(Stream fileStream, string originalFileName, string contentType, CancellationToken cancellationToken = default)
    {
        var extension = Path.GetExtension(originalFileName).TrimStart('.').ToLowerInvariant();
        if (!MagicNumbers.ContainsKey(extension))
        {
            throw new ArgumentException($"Extensión no permitida: {extension}");
        }

        // Validación binaria de magic numbers
        var header = new byte[8];
        fileStream.Position = 0;
        var bytesRead = await fileStream.ReadAsync(header.AsMemory(0, header.Length), cancellationToken);
        fileStream.Position = 0;

        var expectedMagic = MagicNumbers[extension];
        if (bytesRead < expectedMagic.Length || !header.Take(expectedMagic.Length).SequenceEqual(expectedMagic))
        {
            throw new InvalidOperationException("El contenido del archivo no coincide con su formato declarado.");
        }

        var uniqueFileName = $"{Guid.NewGuid():N}.{extension}";
        var destinationPath = Path.Combine(_baseUploadPath, uniqueFileName);

        using (var output = new FileStream(destinationPath, FileMode.Create, FileAccess.Write))
        {
            await fileStream.CopyToAsync(output, cancellationToken);
        }

        return $"/uploads/{uniqueFileName}";
    }

    public Task<bool> DeleteFileAsync(string relativeFilePath, CancellationToken cancellationToken = default)
    {
        var fileName = Path.GetFileName(relativeFilePath);
        var fullPath = Path.Combine(_baseUploadPath, fileName);

        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
            return Task.FromResult(true);
        }

        return Task.FromResult(false);
    }

    public Task<(Stream Stream, string ContentType)?> GetFileAsync(string relativeFilePath, CancellationToken cancellationToken = default)
    {
        var fileName = Path.GetFileName(relativeFilePath);
        var fullPath = Path.Combine(_baseUploadPath, fileName);

        if (!File.Exists(fullPath))
        {
            return Task.FromResult<(Stream Stream, string ContentType)?>(null);
        }

        var extension = Path.GetExtension(fileName).TrimStart('.').ToLowerInvariant();
        var contentType = extension switch
        {
            "jpg" or "jpeg" => "image/jpeg",
            "png" => "image/png",
            "webp" => "image/webp",
            _ => "application/octet-stream"
        };

        Stream stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult<(Stream Stream, string ContentType)?>((stream, contentType));
    }
}
