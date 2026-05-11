
using TolkApi.Posts;

namespace TolkApi.Comments;

public record CreateUpdateCommentDto(
    long Id,
    ContentType ContentType,
    string Content,
    long? ParentId,
    DateTime CreatedAt,
    DateTime? UpdatedAt
    );