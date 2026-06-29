using System.ComponentModel.DataAnnotations;
using TolkApi.Users.DTO;

namespace TolkApi.DTO;

public record PagedUserFollowsDto(
    [Required]
    GetUserFollowsDto[] Follows,
    string? NextPageToken
);
