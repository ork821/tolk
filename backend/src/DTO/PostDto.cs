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
    string AuthorUsername,
    [property: Required]
    string AuthorDisplayName,
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
            reader.GetString(5),
            reader.GetString(6),
            reader.GetBoolean(7),
            reader.GetInt64(8),
            reader.GetInt64(9),
            reader.GetDateTime(10),
            reader.IsDBNull(11) ? null : reader.GetDateTime(11)
        );
    }
}
