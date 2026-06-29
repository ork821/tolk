using System.ComponentModel.DataAnnotations;
using Npgsql;

namespace TolkApi.DTO;

public record PostDto(
    [Required]
    string Id,
    [Required]
    string Title,
    [Required]
    int ContentType,
    [Required]
    string Content,
    string? ParentPostId,
    [Required]
    string AuthorUsername,
    [Required]
    string AuthorDisplayName,
    [Required]
    bool IsCommentsEnabled,
    [Required]
    long CommentsCount,
    [Required]
    long RepliesCount,
    [Required]
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
