using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace MindzBackDotNet.Utility;

[AttributeUsage(AttributeTargets.Parameter)]
public class FromClaimAttribute : Attribute, IBindingSourceMetadata, IModelNameProvider
{
    public FromClaimAttribute(string type)
    {
        Name = type;
    }

    public BindingSource BindingSource => ClaimBindingSource.Claim;

    public string Name { get; }
}