using System.ComponentModel.DataAnnotations;

namespace TolkApi.DTO;

public record AuthorDto(
    [property: Required]
    string Username,
    [property: Required]
    string DisplayName,
    string? AvatarUrl,
    [property: Required]
    bool IsDeleted
);
