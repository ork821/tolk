using System.ComponentModel.DataAnnotations;

namespace TolkApi.Auth.DTO;

public record AuthTokenDto(
    [property: Required]
    string AccessToken,
    [property: Required]
    DateTime Expires
);
