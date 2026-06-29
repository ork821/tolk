using System.ComponentModel.DataAnnotations;
using Npgsql;
using TolkApi.Posts;

namespace TolkApi.DTO;

public record CommentEntity(
    [Required]
    string Id,
    [Required]
    string AuthorUsername,
    [Required]
    string AuthorDisplayName,
    [Required]
    ContentType Type,
    [Required]
    string Content,
    [Required]
    long RepliesCount,
    [Required]
    DateTime CreatedAt,
    DateTime? UpdatedAt
)
{
    public static CommentEntity FromReader(NpgsqlDataReader reader)
    {
        return new CommentEntity(
            reader.GetInt64(0).ToString(),
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
