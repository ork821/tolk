using Npgsql;

namespace TolkApi.DTO;

public record PostDto(
    long Id,
    string Title,
    int ContentType,
    string Content,
    long? ParentPostId,
    string AuthorUsername,
    string AuthorDisplayName,
    bool IsCommentsEnabled,
    long CommentsCount,
    long RepliesCount,
    DateTime CreatedAt,
    DateTime? UpdatedAt
)
{
    public static PostDto FromReader(NpgsqlDataReader reader)
    {
        return new PostDto(
            reader.GetInt64(0),
            reader.GetString(1),
            reader.GetInt32(2),
            reader.GetString(3),
            reader.IsDBNull(4) ? null : reader.GetInt64(4),
            reader.GetString(5),
            reader.GetString(6),
            reader.GetBoolean(7),
            reader.GetInt64(8),
            reader.GetInt64(9),
            reader.GetDateTime(10),
            reader.IsDBNull(11) ? null : reader.GetDateTime(1)
        );
    }
}