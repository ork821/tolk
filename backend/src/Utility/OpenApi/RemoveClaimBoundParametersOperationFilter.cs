using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace TolkApi.Utility.OpenApi;

public class RemoveClaimBoundParametersOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        if (operation.Parameters == null || operation.Parameters.Count == 0)
        {
            return;
        }

        var claimBoundParameterNames = context.MethodInfo
            .GetParameters()
            .Where(parameter => parameter.GetCustomAttributes(typeof(FromUserIdAttribute), false).Length > 0 ||
                                parameter.GetCustomAttributes(typeof(FromClaimAttribute), false).Length > 0)
            .Select(parameter => parameter.Name)
            .Where(name => name != null)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (claimBoundParameterNames.Count == 0)
        {
            return;
        }

        foreach (var parameter in operation.Parameters
                     .Where(parameter => claimBoundParameterNames.Contains(parameter.Name))
                     .ToArray())
        {
            operation.Parameters.Remove(parameter);
        }
    }
}
