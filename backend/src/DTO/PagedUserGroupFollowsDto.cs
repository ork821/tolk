using System.ComponentModel.DataAnnotations;
using TolkApi.Users.DTO;

namespace TolkApi.DTO;

public record PagedUserGroupFollowsDto(
    [property: Required]
    GetUserFollowingGroupsDto[] Groups,
    string? NextPageToken
);
