using System.ComponentModel.DataAnnotations;
using TolkApi.Posts;

namespace TolkApi.Comments;

public record CreateUpdateCommentDto(
    [property: Required]
    string Id,
    [property: Required]
    ContentType ContentType,
    [property: Required]
    string Content,
    string? ParentId,
    [property: Required]
    DateTime CreatedAt,
    DateTime? UpdatedAt
);
