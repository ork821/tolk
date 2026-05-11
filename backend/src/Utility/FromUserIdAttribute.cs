using Microsoft.AspNetCore.Mvc;

namespace MindzBackDotNet.Utility;

// Указываем, что атрибут можно применять только к параметрам методов и свойствам
[AttributeUsage(AttributeTargets.Parameter | AttributeTargets.Property)]
public class FromUserIdAttribute : ModelBinderAttribute
{
    public FromUserIdAttribute()
    {
        // Привязываем наш атрибут к написанному выше биндеру
        BinderType = typeof(UserIdModelBinder);
    }
}