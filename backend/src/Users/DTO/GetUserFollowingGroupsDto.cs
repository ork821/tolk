using System.ComponentModel.DataAnnotations;

namespace TolkApi.Users.DTO;

public record GetUserFollowingGroupsDto(
    [property: Required]
    string Alias,
    [property: Required]
    DateTime CreatedAt
);
