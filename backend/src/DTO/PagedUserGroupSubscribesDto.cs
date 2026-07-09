using System.ComponentModel.DataAnnotations;
using TolkApi.Users.DTO;

namespace TolkApi.DTO;

public record PagedUserGroupSubscribesDto(
    [property: Required]
    GetUserGroupSubscribesDto[] Groups,
    string? NextPageToken
);
