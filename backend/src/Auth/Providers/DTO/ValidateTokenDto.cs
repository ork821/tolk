using System.ComponentModel.DataAnnotations;

namespace TolkApi.Auth.Providers.DTO;

public record ValidateTokenDto(
    [Required]
    Guid UserId,
    [Required]
    bool Revoked,
    [Required]
    bool IsValid
);
