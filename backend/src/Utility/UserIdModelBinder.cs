using System.Security.Claims;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace TolkApi.Utility;

public class UserIdModelBinder : IModelBinder
{
    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        if (bindingContext == null) throw new ArgumentNullException(nameof(bindingContext));

        // Защита от дурака: проверяем, что атрибут повесили именно на Guid или Guid?
        if (bindingContext.ModelType != typeof(Guid) && bindingContext.ModelType != typeof(Guid?))
        {
            bindingContext.Result = ModelBindingResult.Failed();
            return Task.CompletedTask;
        }

        // Извлекаем клейм из HttpContext
        var userIdClaim = bindingContext.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var userId))
        {
            // Успех: передаем распарсенный Guid в параметр контроллера
            bindingContext.Result = ModelBindingResult.Success(userId);
        }
        else
        {
            // Если клейма нет (например, эндпоинт без [Authorize]) или он не валиден.
            // Для Nullable Guid? вернем null, для обычного Guid вернем Guid.Empty
            if (bindingContext.ModelType == typeof(Guid?))
                bindingContext.Result = ModelBindingResult.Success(null);
            else
                bindingContext.Result = ModelBindingResult.Success(Guid.Empty);
        }

        return Task.CompletedTask;
    }
}