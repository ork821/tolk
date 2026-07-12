using System.ComponentModel.DataAnnotations;

namespace TolkApi.Posts.DTO;

public record CreateUpdatePostDto(
    [property: Required]
    string Id,
    string? ParentPostId,
    string? Title,
    [property: Required]
    int ContentType,
    [property: Required]
    string Content
);
