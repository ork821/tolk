using System.ComponentModel.DataAnnotations;

namespace TolkApi.Auth.DTO;

public record AuthTokenDto(
    [Required]
    string AccessToken,
    [Required]
    DateTime Expires
);
