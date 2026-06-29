using System.ComponentModel.DataAnnotations;

namespace TolkApi.Auth.Providers.DTO;

public record ExternalOAuthLoginDto(
    [Required]
    Guid UserId,
    [Required]
    string Username,
    [Required]
    bool IsNew
);
