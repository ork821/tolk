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
    long RepliesCount,
    [property: Required]
    DateTime CreatedAt,
    DateTime? UpdatedAt
)
{
    public static CommentEntity FromReader(NpgsqlDataReader reader)
    {
        return new CommentEntity(
            reader.GetInt64(0).ToString(),
            new AuthorDto(
                reader.GetString(1),
                reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3)
            ),
            (ContentType)reader.GetInt32(4),
            reader.GetString(5),
            reader.GetInt32(6),
            reader.GetDateTime(7),
            reader.IsDBNull(8) ? null : reader.GetDateTime(8)
        );
    }
}
