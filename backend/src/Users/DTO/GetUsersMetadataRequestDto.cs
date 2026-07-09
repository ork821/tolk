using System.ComponentModel.DataAnnotations;

namespace TolkApi.Users.DTO;

public record GetUsersMetadataRequestDto(
    [property: Required]
    string[] Usernames
);
