using System.ComponentModel.DataAnnotations;

namespace TolkApi.Users.DTO;

public record ReplyAuthorDto(
    [property: Required]
    string Username,
    [property: Required]
    string DisplayName
);
