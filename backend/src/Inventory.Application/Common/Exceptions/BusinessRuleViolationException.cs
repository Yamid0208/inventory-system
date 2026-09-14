namespace Inventory.Application.Common.Exceptions;

public class BusinessRuleViolationException : Exception
{
    public string RuleCode { get; }

    public BusinessRuleViolationException(string ruleCode, string message) 
        : base(message)
    {
        RuleCode = ruleCode;
    }
}
