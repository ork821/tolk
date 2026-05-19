using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace TolkApi.Utility.OpenApi;

public class ApiVersionDocumentFilter : IDocumentFilter
{
    public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
    {
        var paths = swaggerDoc.Paths.ToDictionary(
            path => path.Key.Replace("v{version}", swaggerDoc.Info.Version),
            path => path.Value);

        swaggerDoc.Paths = new OpenApiPaths();
        foreach (var path in paths)
        {
            swaggerDoc.Paths.Add(path.Key, path.Value);
        }

        swaggerDoc.Servers = [new OpenApiServer { Url = "/api" }];
    }
}
