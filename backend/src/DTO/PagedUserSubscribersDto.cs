using System.ComponentModel.DataAnnotations;
using TolkApi.Users.DTO;

namespace TolkApi.DTO;

public record PagedUserSubscribersDto(
    [property: Required]
    GetUserSubscribersDto[] Subscribers,
    string? NextPageToken
);
