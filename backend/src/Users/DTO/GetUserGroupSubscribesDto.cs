using System.ComponentModel.DataAnnotations;

namespace TolkApi.Users.DTO;

public record GetUserGroupSubscribesDto(
    [property: Required]
    string Alias,
    [property: Required]
    DateTime CreatedAt
);
