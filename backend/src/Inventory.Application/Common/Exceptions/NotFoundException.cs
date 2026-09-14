namespace Inventory.Application.Common.Exceptions;

public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }
    public NotFoundException(string entityName, object key) 
        : base($"No se encontró la entidad '{entityName}' con el identificador ({key}).") { }
}
