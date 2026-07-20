using Asp.Versioning;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using TolkApi.Users.DTO;
using TolkApi.Utility;

namespace TolkApi.Users;

[ApiController]
[ApiVersion(1.0)]
[Route("v{version:apiVersion}/profile")]
public class ProfileController(
    UsersService usersService,
    ILogger<ProfileController> logger) : ControllerBase
{
    private const string RefreshTokenCookieName = "refresh_token";

    [IsAuthenticated]
    [HttpDelete]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DeleteProfile([FromUserId] Guid userId)
    {
        var deletedAt = await usersService.DeleteUser(userId);
        if (deletedAt == null) return Unauthorized();

        HttpContext.Response.Cookies.Delete(RefreshTokenCookieName);
        logger.LogInformation("Account {UserId} was scheduled for deletion", userId);
        return NoContent();
    }

    [IsAuthenticated]
    [HttpPatch]
    [ProducesResponseType(typeof(UpdateProfileInfoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdateProfile(
        [FromBody] UpdateProfileInfoBodyDto body,
        [FromUserId] Guid userId)
    {
        var validationResult = await new UpdateProfileInfoBodyDtoValidator().ValidateAsync(body);
        if (!validationResult.IsValid) return BadRequest(validationResult.ToString());

        var result = await usersService.UpdateProfileInfo(
            userId,
            body.DisplayName?.Trim(),
            body.Description?.Trim(),
            body.AvatarUrl?.Trim());

        if (result == null) return Unauthorized();

        return Ok(result);
    }
}

public class UpdateProfileInfoBodyDto
{
    public string? DisplayName { get; init; }
    public string? Description { get; init; }
    public string? AvatarUrl { get; init; }
}

public class UpdateProfileInfoBodyDtoValidator : AbstractValidator<UpdateProfileInfoBodyDto>
{
    public UpdateProfileInfoBodyDtoValidator()
    {
        RuleFor(x => x)
            .Must(x => x.DisplayName != null || x.Description != null || x.AvatarUrl != null)
            .WithMessage("At least one profile field must be provided");

        RuleFor(x => x.DisplayName)
            .NotEmpty()
            .MinimumLength(2)
            .MaximumLength(50)
            .When(x => x.DisplayName != null);

        RuleFor(x => x.Description)
            .MaximumLength(500)
            .When(x => x.Description != null);

        RuleFor(x => x.AvatarUrl)
            .NotEmpty()
            .MaximumLength(2048)
            .Must(BeHttpsUrl)
            .WithMessage("AvatarUrl must be an absolute https URL")
            .When(x => x.AvatarUrl != null);
    }

    private static bool BeHttpsUrl(string? avatarUrl)
    {
        return Uri.TryCreate(avatarUrl, UriKind.Absolute, out var uri)
               && uri.Scheme == Uri.UriSchemeHttps;
    }
}
