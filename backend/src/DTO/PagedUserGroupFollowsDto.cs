using System.ComponentModel.DataAnnotations;
using TolkApi.Users.DTO;

namespace TolkApi.DTO;

public record PagedUserGroupFollowsDto(
    [Required]
    GetUserFollowingGroupsDto[] Groups,
    string? NextPageToken
);
