using Microsoft.AspNetCore.Routing;

namespace TolkApi.Utility.Routing;

public class LowercaseRouteParameterTransformer : IOutboundParameterTransformer
{
    public string? TransformOutbound(object? value)
    {
        return value?.ToString()?.ToLowerInvariant();
    }
}
