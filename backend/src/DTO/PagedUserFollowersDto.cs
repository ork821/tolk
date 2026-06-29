using System.ComponentModel.DataAnnotations;
using TolkApi.Users.DTO;

namespace TolkApi.DTO;

public record PagedUserFollowersDto(
    [Required]
    GetUserFollowersDto[] Followers,
    string? NextPageToken
);
