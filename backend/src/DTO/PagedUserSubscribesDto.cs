using System.ComponentModel.DataAnnotations;
using TolkApi.Users.DTO;

namespace TolkApi.DTO;

public record PagedUserSubscribesDto(
    [property: Required]
    GetUserSubscribesDto[] Subscribes,
    string? NextPageToken
);
