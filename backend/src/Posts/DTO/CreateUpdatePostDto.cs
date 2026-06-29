using System.ComponentModel.DataAnnotations;

namespace TolkApi.Posts.DTO;

public record CreateUpdatePostDto(
    [Required]
    string Id,
    string? ParentPostId,
    [Required]
    string Title,
    [Required]
    int ContentType,
    [Required]
    string Content
);
