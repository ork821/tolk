using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace TolkApi.Auth;

public class AuthOptions
{
    public const string ISSUER = "TolkAPIServer"; // издатель токена

    public const string AUDIENCE = "WebClient"; // потребитель токена
    private readonly IConfiguration _config;

    public AuthOptions(IConfiguration config)
    {
        _config = config;
    }

    public SymmetricSecurityKey GetSymmetricAccessSecurityKey()
    {
        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["JwtSettings:AccessSecret"]!));
    }

    public byte[] GetRefreshTokenHashKey()
    {
        var secret = _config["JwtSettings:RefreshTokenHashSecret"];
        if (string.IsNullOrWhiteSpace(secret))
        {
            throw new InvalidOperationException("JwtSettings:RefreshTokenHashSecret is missing");
        }

        return Encoding.UTF8.GetBytes(secret);
    }
}
