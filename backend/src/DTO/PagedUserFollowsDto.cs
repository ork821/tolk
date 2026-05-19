using TolkApi.Users.DTO;

namespace TolkApi.DTO;

public record PagedUserFollowsDto(
    GetUserFollowsDto[] Follows,
    string? NextPageToken
);
