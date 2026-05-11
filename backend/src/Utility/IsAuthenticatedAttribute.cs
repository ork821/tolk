using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace TolkApi.Utility;

public class IsAuthenticatedAttribute : TypeFilterAttribute
{
    public IsAuthenticatedAttribute() : base(typeof(IsAuthorizedAttributeActionFilter))
    {
    }
}

public class IsAuthorizedAttributeActionFilter : IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var userId = context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier);
        if (userId == null) context.Result = new UnauthorizedResult();
    }
}