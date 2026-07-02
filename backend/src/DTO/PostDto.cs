using System.ComponentModel.DataAnnotations;
using Npgsql;

namespace TolkApi.DTO;

public record PostDto(
    [property: Required]
    string Id,
    [property: Required]
    string Title,
    [property: Required]
    int ContentType,
    [property: Required]
    string Content,
    string? ParentPostId,
    [property: Required]
    AuthorDto Author,
    [property: Required]
    bool IsCommentsEnabled,
    [property: Required]
    long CommentsCount,
    [property: Required]
    long RepliesCount,
    [property: Required]
    DateTime CreatedAt,
    DateTime? UpdatedAt
)
{
    public static PostDto FromReader(NpgsqlDataReader reader)
    {
        return new PostDto(
            reader.GetInt64(0).ToString(),
            reader.GetString(1),
            reader.GetInt32(2),
            reader.GetString(3),
            reader.IsDBNull(4) ? null : reader.GetInt64(4).ToString(),
            new AuthorDto(
                reader.GetString(5),
                reader.GetString(6),
                reader.IsDBNull(7) ? null : reader.GetString(7)
            ),
            reader.GetBoolean(8),
            reader.GetInt64(9),
            reader.GetInt64(10),
            reader.GetDateTime(11),
            reader.IsDBNull(12) ? null : reader.GetDateTime(12)
        );
    }
}
