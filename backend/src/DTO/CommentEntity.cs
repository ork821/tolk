using MindzBackDotNet.Posts;
using Npgsql;

namespace MindzBackDotNet.DTO;

public record CommentEntity(
    long Id,
    string AuthorUsername,
    string AuthorDisplayName,
    ContentType Type,
    string Content,
    long RepliesCount,
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