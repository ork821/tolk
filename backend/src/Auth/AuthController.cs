using System.ComponentModel.DataAnnotations;
using Asp.Versioning;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TolkApi.Auth.DTO;
using TolkApi.Auth.Providers;
using TolkApi.Utility;

namespace TolkApi.Auth;

[ApiController]
[ApiVersion(1.0)]
[Route("v{version:apiVersion}/[controller]")]
public class AuthController(
    AuthService authService,
    TokenService tokenService,
    ExternalUserInfoProviderFactory externalUserInfoProviderFactory
)
    : ControllerBase
{
    private const string RefreshTokenCookieName = "refresh_token";
    private static readonly HashSet<string> SupportedProviders = ["yandex", "vk"];
    private readonly AuthService _authService = authService;

    [HttpGet("providers")]
    [ProducesResponseType(typeof(AuthProvidersDto), StatusCodes.Status200OK)]
    public IActionResult GetProviders()
    {
        // Возвращаем список доступных провайдеров
        return Ok(new AuthProvidersDto(SupportedProviders.ToArray()));
    }

    [HttpPost("{provider}")] // provider = "google"
    [ProducesResponseType(typeof(AuthTokenDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SocialLogin(
        string provider,
        [FromBody] OAuthLoginDto dto,
        CancellationToken cancellationToken)
    {
        if (!SupportedProviders.Contains(provider)) return BadRequest("Provider is not supported");

        var validationResult = await new OAuthLoginDtoValidator().ValidateAsync(dto, cancellationToken);
        if (!validationResult.IsValid) return BadRequest(validationResult.ToString());

        var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();
        if (string.IsNullOrWhiteSpace(userAgent)) return BadRequest("Invalid UserAgent");

        
        var providerInstance = externalUserInfoProviderFactory.GetProvider(provider);
        if (providerInstance == null) return BadRequest("Provider is not supported");

        // 1. Провалидировали в Google
        var externalUserInfo = await providerInstance.GetUserInfo(dto.Token, cancellationToken);
        if (externalUserInfo == null) return Unauthorized("Невалидный токен");
        
        // 2. Ищем или создаем пользователя (наша логика)
        var user = await _authService.LoginOAuth(
            provider,
            externalUserInfo.Id,
            externalUserInfo.Username,
            externalUserInfo.Email,
            externalUserInfo.DisplayName,
            externalUserInfo.AvatarUrl
        );

        if (user == null) return Unauthorized();

        // 3. Выдаем НАШИ токены
        
        var expires = DateTime.UtcNow.Add(TimeSpan.FromMinutes(30));
        var accessToken = tokenService.GenerateAccessToken(user.UserId, expires);
        var refreshToken = tokenService.GenerateRefreshToken();

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var sessionId = await _authService.CreateAuthSession(user.UserId, userAgent, ipAddress);
        if (!sessionId.HasValue) return StatusCode(StatusCodes.Status503ServiceUnavailable);

        var refreshSaved = await _authService.SaveRefreshToken(sessionId.Value, refreshToken, 30);
        if (!refreshSaved) return StatusCode(StatusCodes.Status503ServiceUnavailable);

        HttpContext.Response.Cookies.Append(RefreshTokenCookieName, refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict
        });

        return Ok(new AuthTokenDto(accessToken, expires));
    }

    [HasRefresh]
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(AuthTokenDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> RefreshTokens()
    {
        HttpContext.Request.Cookies.TryGetValue(RefreshTokenCookieName, out var refresh);
        if (refresh == null) return Unauthorized();

        var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();
        if (string.IsNullOrWhiteSpace(userAgent)) return BadRequest("Invalid UserAgent");

        var refreshToken = tokenService.GenerateRefreshToken();
        var rotation = await _authService.RotateRefreshToken(
            refresh,
            refreshToken,
            30,
            userAgent,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            HttpContext.RequestAborted);

        if (rotation?.ShouldRevokeAll == true && rotation.UserId.HasValue)
        {
            Console.WriteLine($"Refresh token reuse detected for user {rotation.UserId}");
            await _authService.RevokeAllRefreshTokens(rotation.UserId.Value, null);
            return Unauthorized();
        }

        if (rotation?.IsRotated != true || !rotation.UserId.HasValue) return Unauthorized();

        var userId = rotation.UserId.Value;
        var expires = DateTime.UtcNow.Add(TimeSpan.FromMinutes(30));
        var accessToken = tokenService.GenerateAccessToken(userId, expires);

        HttpContext.Response.Cookies.Append(RefreshTokenCookieName, refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict
        });

        return Ok(new AuthTokenDto(accessToken, expires));
    }

    [Authorize]
    [HasRefresh]
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout(
        [FromUserId] Guid? userId
    )
    {
        HttpContext.Request.Cookies.TryGetValue(RefreshTokenCookieName, out var refresh);
        if (userId == null || refresh == null) return Unauthorized();

        await _authService.RevokeRefreshToken(refresh);
        HttpContext.Response.Cookies.Delete(RefreshTokenCookieName);
        return NoContent();
    }
}

// DTO для авторизации
public class OAuthLoginDto
{
    [Required]
    public required string Token { get; init; }

    public string? RedirectUri { get; init; }
}

public class OAuthLoginDtoValidator : AbstractValidator<OAuthLoginDto>
{
    public OAuthLoginDtoValidator()
    {
        RuleFor(x => x.Token)
            .NotEmpty()
            .MaximumLength(4096)
            .WithMessage("Token must be between 1 and 4096 characters");
    }
}
