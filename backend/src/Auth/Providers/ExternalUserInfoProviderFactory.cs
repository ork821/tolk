namespace TolkApi.Auth.Providers;

public class ExternalUserInfoProviderFactory(
    YandexExternalUserInfoProvider yandexProvider,
    VkExternalUserInfoProvider vkProvider)
{
    public IAbstractExternalUserInfoProvider? GetProvider(string type)
    {
        switch (type)
        {
            case "yandex": return yandexProvider;
            case "vk": return vkProvider;
            default: return null;
        }
    }
}
