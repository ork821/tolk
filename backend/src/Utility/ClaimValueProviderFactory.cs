using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace TolkApi.Utility;

public class ClaimValueProviderFactory : IValueProviderFactory
{
    public Task CreateValueProviderAsync(ValueProviderFactoryContext context)
    {
        context.ValueProviders.Add(new ClaimValueProvider(ClaimBindingSource.Claim,
            context.ActionContext.HttpContext.User));
        return Task.CompletedTask;
    }
}