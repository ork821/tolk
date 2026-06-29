using System.ComponentModel.DataAnnotations;

namespace TolkApi.Users.DTO;

public record GetUserFollowingGroupsDto(
    [Required]
    string Alias,
    [Required]
    DateTime CreatedAt
);
