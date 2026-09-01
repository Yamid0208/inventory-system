namespace Inventory.Application.Common.Interfaces;

public interface IFileStorageService
{
    Task<string> SaveFileAsync(Stream fileStream, string originalFileName, string contentType, CancellationToken cancellationToken = default);
    Task<bool> DeleteFileAsync(string relativeFilePath, CancellationToken cancellationToken = default);
    Task<(Stream Stream, string ContentType)?> GetFileAsync(string relativeFilePath, CancellationToken cancellationToken = default);
}
