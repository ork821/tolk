using System.ComponentModel.DataAnnotations;
using TolkApi.Posts;

namespace TolkApi.Comments;

public record CreateUpdateCommentDto(
    [property: Required]
    long Id,
    [property: Required]
    ContentType ContentType,
    [property: Required]
    string Content,
    long? ParentId,
    [property: Required]
    DateTime CreatedAt,
    DateTime? UpdatedAt
);
