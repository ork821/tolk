namespace TolkApi.Auth.Providers;

public class ExternalUserInfoProviderFactory
{
    public static IAbstractExternalUserInfoProvider? GetProvider(string type)
    {
        switch (type)
        {
            case "yandex": return new YandexExternalUserInfoProvider();
            default: return null;
        }
    }
}