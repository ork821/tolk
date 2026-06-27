using System.ComponentModel.DataAnnotations;

namespace TolkApi.Auth.DTO;

public record AuthProvidersDto(
    [property: Required]
    string[] Providers
);
