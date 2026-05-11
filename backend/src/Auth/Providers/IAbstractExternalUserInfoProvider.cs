using TolkApi.Auth.Providers.DTO;

namespace TolkApi.Auth.Providers;

public interface IAbstractExternalUserInfoProvider
{
    Task<SocialProfileInfo?> GetUserInfo(string token);
}