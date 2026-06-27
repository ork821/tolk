using System.ComponentModel.DataAnnotations;
using Npgsql;
using TolkApi.Posts;

namespace TolkApi.DTO;

public record CommentEntity(
    [property: Required]
    long Id,
    [property: Required]
    string AuthorUsername,
    [property: Required]
    string AuthorDisplayName,
    [property: Required]
    ContentType Type,
    [property: Required]
    string Content,
    [property: Required]
    long RepliesCount,
    [property: Required]
    DateTime CreatedAt,
    DateTime? UpdatedAt
)
{
    public static CommentEntity FromReader(NpgsqlDataReader reader)
    {
        return new CommentEntity(
            reader.GetInt64(0),
            reader.GetString(1),
            reader.GetString(2),
            (ContentType)reader.GetInt32(3),
            reader.GetString(4),
            reader.GetInt32(5),
            reader.GetDateTime(6),
            reader.IsDBNull(7) ? null : reader.GetDateTime(7)
        );
    }
}
