using System.ComponentModel.DataAnnotations;

namespace TolkApi.Auth.Providers.DTO;

public record SocialProfileInfo(
    [Required]
    string Id,
    string? Username,
    string? Email,
    string? DisplayName
);
