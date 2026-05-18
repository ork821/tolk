using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace TolkApi.Utility;

public class HasRefreshAttribute : TypeFilterAttribute
{
    public HasRefreshAttribute() : base(typeof(HasRefreshAttributeActionFilter))
    {
    }
}

public class HasRefreshAttributeActionFilter : IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var hasRefresh = context.HttpContext.Request.Cookies.ContainsKey("refresh_token");
        if (!hasRefresh) context.Result = new UnauthorizedResult();
    }
}
