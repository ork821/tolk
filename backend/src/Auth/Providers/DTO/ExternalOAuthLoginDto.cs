using System.ComponentModel.DataAnnotations;

namespace TolkApi.Auth.Providers.DTO;

public record ExternalOAuthLoginDto(
    [property: Required]
    Guid UserId,
    [property: Required]
    string Username,
    [property: Required]
    bool IsNew,
    DateTime? DeletedAt
);
