namespace Inventory.Application.Common.Models;

public class Result
{
    public bool Succeeded { get; init; }
    public string? Error { get; init; }
    public IReadOnlyCollection<string> Errors { get; init; }

    protected Result(bool succeeded, string? error, IEnumerable<string>? errors = null)
    {
        Succeeded = succeeded;
        Error = error;
        Errors = errors != null ? errors.ToList().AsReadOnly() : Array.Empty<string>();
    }

    public static Result Success() => new(true, null);
    public static Result Failure(string error) => new(false, error, new[] { error });
    public static Result Failure(IEnumerable<string> errors) => new(false, errors.FirstOrDefault(), errors);
}

public class Result<T> : Result
{
    public T? Value { get; init; }

    protected Result(bool succeeded, T? value, string? error, IEnumerable<string>? errors = null)
        : base(succeeded, error, errors)
    {
        Value = value;
    }

    public static Result<T> Success(T value) => new(true, value, null);
    public static new Result<T> Failure(string error) => new(false, default, error, new[] { error });
    public static new Result<T> Failure(IEnumerable<string> errors) => new(false, default, errors.FirstOrDefault(), errors);
}
