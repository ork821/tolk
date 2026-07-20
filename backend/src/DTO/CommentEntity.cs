using System.ComponentModel.DataAnnotations;
using Npgsql;
using TolkApi.Posts;

namespace TolkApi.DTO;

public record CommentEntity(
    [property: Required]
    string Id,
    [property: Required]
    AuthorDto Author,
    [property: Required]
    ContentType Type,
    [property: Required]
    string Content,
    [property: Required]
    long VisibleRepliesCount,
    [property: Required]
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    DateTime? DeletedAt
)
{
    public static CommentEntity FromReader(NpgsqlDataReader reader)
    {
        var isAuthorDeleted = !reader.IsDBNull(4);

        return new CommentEntity(
            reader.GetInt64(0).ToString(),
            new AuthorDto(
                isAuthorDeleted ? string.Empty : reader.GetString(1),
                isAuthorDeleted ? string.Empty : reader.GetString(2),
                isAuthorDeleted || reader.IsDBNull(3) ? null : reader.GetString(3),
                isAuthorDeleted
            ),
            (ContentType)reader.GetInt32(5),
            reader.GetString(6),
            reader.GetInt32(7),
            reader.GetDateTime(8),
            reader.IsDBNull(9) ? null : reader.GetDateTime(9),
            reader.IsDBNull(10) ? null : reader.GetDateTime(10)
        );
    }
}
