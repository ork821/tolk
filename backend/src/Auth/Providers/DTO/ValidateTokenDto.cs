using System.ComponentModel.DataAnnotations;

namespace TolkApi.Auth.Providers.DTO;

public record ValidateTokenDto(
    [property: Required]
    Guid UserId,
    [property: Required]
    bool Revoked,
    [property: Required]
    bool IsValid
);
