using System.ComponentModel.DataAnnotations;
using TolkApi.Users.DTO;

namespace TolkApi.DTO;

public record PagedUserFollowsDto(
    [property: Required]
    GetUserFollowsDto[] Follows,
    string? NextPageToken
);
