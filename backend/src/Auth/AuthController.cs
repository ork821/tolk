using Asp.Versioning;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MindzBackDotNet.Auth.Providers;
using MindzBackDotNet.Utility;

namespace MindzBackDotNet.Auth;

[ApiController]
[ApiVersion(1.0)]
[Route("v{version:apiVersion}/[controller]")]
public class AuthController(
    AuthService authService,
    TokenService tokenService,
    IConfiguration configuration
)
    : ControllerBase
{
    private static readonly HashSet<string> SupportedProviders = ["yandex", "vk"];
    private readonly AuthService _authService = authService;
    private readonly IConfiguration _config = configuration;

    [HttpGet("providers")]
    public IActionResult GetProviders()
    {
        // Возвращаем список доступных провайдеров
        var providers = new[] { "vk", "yandex" };
        return Ok(new { Providers = SupportedProviders.ToArray() });
    }

    [HttpPost("{provider}")] // provider = "google"
    public async Task<IActionResult> SocialLogin(string provider, [FromBody] OAuthLoginDto dto)
    {
        if (!SupportedProviders.Contains(provider)) return BadRequest("Provider is not supported");

        var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();
        if (string.IsNullOrWhiteSpace(userAgent)) return BadRequest("Invalid UserAgent");

        
        var providerInstance = ExternalUserInfoProviderFactory.GetProvider(provider);
        if (providerInstance == null) return BadRequest("Provider is not supported");

        // 1. Провалидировали в Google
        var externalUserInfo = await providerInstance.GetUserInfo(dto.Token);
        if (externalUserInfo == null) return Unauthorized("Невалидный токен");
        
        // 2. Ищем или создаем пользователя (наша логика)
        var user = await _authService.LoginOAuth(
            provider,
            externalUserInfo.Id,
            externalUserInfo.Username,
            externalUserInfo.Email,
            externalUserInfo.DisplayName
        );

        // 3. Выдаем НАШИ токены
        
        var expires = DateTime.UtcNow.Add(TimeSpan.FromMinutes(30));
        var accessToken = tokenService.GenerateAccessToken(user.UserId, expires);
        var refreshToken = tokenService.GenerateRefreshToken();


        await _authService.SaveRefreshToken(user.UserId, refreshToken, 30, userAgent);

        HttpContext.Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict
        });

        return Ok(new
        {
            AccessToken = accessToken,
            Expires = expires
        });
    }

    [Authorize]
    [HasRefresh]
    [HttpGet("refresh")]
    public async Task<ActionResult> RefreshTokens([FromUserId] Guid? claimUserId)
    {
        HttpContext.Request.Cookies.TryGetValue("refresh_token", out var refresh);
        if (claimUserId == null || refresh == null) return Unauthorized();

        var userRefreshToken = await _authService.ValidateRefreshToken(refresh);
        if (userRefreshToken == null || userRefreshToken.IsValid != true) return Unauthorized();

        if (userRefreshToken.Revoked)
        {
            Console.WriteLine($"User come with revoked refresh key {userRefreshToken.UserId} - {refresh}");
            await _authService.RevokeAllRefreshTokens(userRefreshToken.UserId, null);
            return Unauthorized();
        }

        var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();
        if (string.IsNullOrWhiteSpace(userAgent)) return BadRequest("Invalid UserAgent");

        await _authService.RevokeRefreshToken(refresh);

        var expires = DateTime.UtcNow.Add(TimeSpan.FromMinutes(30));
        var accessToken = tokenService.GenerateAccessToken((Guid)claimUserId, expires);
        var refreshToken = tokenService.GenerateRefreshToken();


        await _authService.SaveRefreshToken((Guid)claimUserId, refreshToken, 30, userAgent);

        HttpContext.Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict
        });

        return Ok(new
        {
            AccessToken = accessToken,
            Expires = expires
        });
    }


    [HttpGet("logout")]
    public async Task<IActionResult> Logout(
        [FromUserId] Guid? userId
    )
    {
        HttpContext.Request.Cookies.TryGetValue("refresh_token", out var refresh);
        if (userId == null || refresh == null) return Unauthorized();

        await _authService.RevokeRefreshToken(refresh);
        HttpContext.Response.Cookies.Delete("refresh");
        return NoContent();
    }
}

// DTO для авторизации
public record OAuthLoginDto(
    string Token,
    string? RedirectUri
);

public class OAuthLoginDtoValidator : AbstractValidator<OAuthLoginDto>
{
    public OAuthLoginDtoValidator()
    {
        RuleFor(x => x.Token)
            .NotEmpty().WithMessage("Token shouldn't be empty");
    }
}