using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Globalization;
using Microsoft.IdentityModel.Tokens;
using TolkApi.Database;

namespace TolkApi.Auth;

public class TokenService(DatabaseContext context, AuthOptions config)
{
    private const string RecoveryAudience = "AccountRecovery";
    private const string RecoveryPurpose = "account_restore";
    private const string RecoveryUserIdClaim = "recovery_user_id";
    private const string DeletedAtClaim = "deleted_at_ticks";
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

    public string GenerateAccountRecoveryToken(Guid userId, DateTime deletedAt, DateTime expires)
    {
        var claims = new List<Claim>
        {
            new("purpose", RecoveryPurpose),
            new(RecoveryUserIdClaim, userId.ToString()),
            new(DeletedAtClaim, deletedAt.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture))
        };

        var jwt = new JwtSecurityToken(
            AuthOptions.ISSUER,
            RecoveryAudience,
            claims,
            expires: expires,
            signingCredentials: new SigningCredentials(
                config.GetSymmetricAccessSecurityKey(),
                SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }

    public AccountRecoveryTokenData? ValidateAccountRecoveryToken(string token)
    {
        try
        {
            var principal = new JwtSecurityTokenHandler().ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = AuthOptions.ISSUER,
                ValidateAudience = true,
                ValidAudience = RecoveryAudience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = config.GetSymmetricAccessSecurityKey(),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30)
            }, out _);

            if (principal.FindFirstValue("purpose") != RecoveryPurpose
                || !Guid.TryParse(principal.FindFirstValue(RecoveryUserIdClaim), out var userId)
                || !long.TryParse(
                    principal.FindFirstValue(DeletedAtClaim),
                    NumberStyles.None,
                    CultureInfo.InvariantCulture,
                    out var deletedAtTicks))
            {
                return null;
            }

            return new AccountRecoveryTokenData(userId, new DateTime(deletedAtTicks, DateTimeKind.Utc));
        }
        catch (SecurityTokenException)
        {
            return null;
        }
        catch (ArgumentException)
        {
            return null;
        }
    }
}

public record AccountRecoveryTokenData(Guid UserId, DateTime DeletedAt);
