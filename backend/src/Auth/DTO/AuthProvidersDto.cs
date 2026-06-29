using System.ComponentModel.DataAnnotations;

namespace TolkApi.Auth.DTO;

public record AuthProvidersDto(
    [Required]
    string[] Providers
);
