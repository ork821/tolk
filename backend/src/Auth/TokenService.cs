using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;
using TolkApi.Database;

namespace TolkApi.Auth;

public class TokenService(DatabaseContext context, AuthOptions config)
{
    private readonly DatabaseContext _context = context;


    public string GenerateAccessToken(Guid userId, DateTime expires)
    {
        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, userId.ToString()) };


        var jwt = new JwtSecurityToken(
            AuthOptions.ISSUER,
            AuthOptions.AUDIENCE,
            claims,
            expires: expires,
            signingCredentials: new SigningCredentials(config.GetSymmetricAccessSecurityKey(),
                SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }


    public string GenerateRefreshToken()
    {
        // 32 байта дадут нам 44 символа в Base64. 
        // Этого более чем достаточно для абсолютной уникальности и защиты от перебора.
        var randomBytes = new byte[32];

        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomBytes);
        }

        // Конвертируем в строку, безопасную для URL и Cookie (опционально можно убрать +=)
        return Convert.ToBase64String(randomBytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }
}