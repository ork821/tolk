using System.ComponentModel.DataAnnotations;
using Npgsql;
using TolkApi.Users.DTO;

namespace TolkApi.DTO;

public record PostDto(
    [property: Required]
    string Id,
    
    string? Title,
    
    [property: Required]
    int ContentType,
    
    [property: Required]
    string Content,
    
    ReplyAuthorDto? ReplyAuthor,
    
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
    
    DateTime? UpdatedAt,
    
    DateTime? DeletedAt
)
{
    public static PostDto FromReader(NpgsqlDataReader reader)
    {
        var isReplyAuthorDeleted = !reader.IsDBNull(6);
        var isAuthorDeleted = !reader.IsDBNull(10);

        return new PostDto(
            reader.GetInt64(0).ToString(),
            reader.IsDBNull(1) ? null : reader.GetString(1),
            reader.GetInt32(2),
            reader.GetString(3),
            !reader.IsDBNull(4) ? new ReplyAuthorDto(
                isReplyAuthorDeleted ? string.Empty : reader.GetString(4),
                isReplyAuthorDeleted ? string.Empty : reader.GetString(5),
                isReplyAuthorDeleted
            ) : null,
            new AuthorDto(
                isAuthorDeleted ? string.Empty : reader.GetString(7),
                isAuthorDeleted ? string.Empty : reader.GetString(8),
                isAuthorDeleted || reader.IsDBNull(9) ? null : reader.GetString(9),
                isAuthorDeleted
            ),
            reader.GetBoolean(11),
            reader.GetInt64(12),
            reader.GetInt64(13),
            reader.GetDateTime(14),
            reader.IsDBNull(15) ? null : reader.GetDateTime(15),
            reader.IsDBNull(16) ? null : reader.GetDateTime(16)
        );
    }
}
