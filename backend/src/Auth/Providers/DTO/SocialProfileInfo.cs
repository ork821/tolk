using System.ComponentModel.DataAnnotations;

namespace TolkApi.Auth.Providers.DTO;

public record SocialProfileInfo(
    [property: Required]
    string Id,
    string? Username,
    string? Email,
    string? DisplayName
);
