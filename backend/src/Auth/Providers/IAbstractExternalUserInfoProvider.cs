using MindzBackDotNet.Auth.Providers.DTO;

namespace MindzBackDotNet.Auth.Providers;

public interface IAbstractExternalUserInfoProvider
{
    Task<SocialProfileInfo?> GetUserInfo(string token);
}