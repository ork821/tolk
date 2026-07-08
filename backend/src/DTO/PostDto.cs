using System.ComponentModel.DataAnnotations;
using Npgsql;
using TolkApi.Users.DTO;

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
        return new PostDto(
            reader.GetInt64(0).ToString(),
            reader.GetString(1),
            reader.GetInt32(2),
            reader.GetString(3),
            !reader.IsDBNull(4) ? new ReplyAuthorDto(
                reader.GetString(4),
                reader.GetString(5)
            ) : null,
            new AuthorDto(
                reader.GetString(6),
                reader.GetString(7),
                reader.IsDBNull(8) ? null : reader.GetString(8)
            ),
            reader.GetBoolean(9),
            reader.GetInt64(10),
            reader.GetInt64(11),
            reader.GetDateTime(12),
            reader.IsDBNull(13) ? null : reader.GetDateTime(13),
            reader.IsDBNull(14) ? null : reader.GetDateTime(14)
        );
    }
}
