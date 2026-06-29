using System.ComponentModel.DataAnnotations;
using TolkApi.Posts;

namespace TolkApi.Comments;

public record CreateUpdateCommentDto(
    [Required]
    string Id,
    [Required]
    ContentType ContentType,
    [Required]
    string Content,
    string? ParentId,
    [Required]
    DateTime CreatedAt,
    DateTime? UpdatedAt
);
