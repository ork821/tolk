using TolkApi.Users.DTO;

namespace TolkApi.DTO;

public record PagedUserFollowersDto(
    GetUserFollowersDto[] Followers,
    string? NextPageToken
);
