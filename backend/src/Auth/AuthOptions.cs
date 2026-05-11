using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace MindzBackDotNet.Auth;

public class AuthOptions
{
    public const string ISSUER = "InMindzServer"; // издатель токена

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
}