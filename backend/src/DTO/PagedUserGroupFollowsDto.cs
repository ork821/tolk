using TolkApi.Users.DTO;

namespace TolkApi.DTO;

public record PagedUserGroupFollowsDto(
    GetUserFollowingGroupsDto[] Groups,
    string? NextPageToken
);
