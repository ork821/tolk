using TolkApi.Database;
using TolkApi.DTO;
using TolkApi.Posts;

namespace TolkApi.Comments;

public class CommentsService(DatabaseContext databaseContext)
{

    public async Task<CommentEntity[]> GetCommentReplies(long commentId, int limit, DateTime? lastCreatedAt, long? lastId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(
                "SELECT * FROM main.get_reply_comments(@commentId, @limit, @lastCreatedAt,  @lastId)");
        
        command.Parameters.AddWithValue("@commentId", commentId);
        command.Parameters.AddWithValue("@limit", limit);
        command.Parameters.AddWithValue("@lastCreatedAt", lastCreatedAt == null ? DBNull.Value : lastCreatedAt);
        command.Parameters.AddWithValue("@lastId", lastId == null ? DBNull.Value : lastId);
        
        await using var reader = await command.ExecuteReaderAsync();
        var comments = new List<CommentEntity>();
        while (await reader.ReadAsync())
        {
            comments.Add(CommentEntity.FromReader(reader));
        }
        return comments.ToArray();
    }

    public async Task<CreateUpdateCommentDto?> CreateComment(long postId, long commentId, Guid userId, 
        ContentType contentType, string content)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(
                "SELECT * FROM main.create_comment(@postId, @commentId, @userId, @contentType, @content)");
        
        command.Parameters.AddWithValue("@postId", postId);
        command.Parameters.AddWithValue("@commentId", commentId);
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@contentType", contentType);
        command.Parameters.AddWithValue("@content", content);
        
        
        await using var reader = await command.ExecuteReaderAsync();

        if (await reader.ReadAsync())
        {
            return new CreateUpdateCommentDto(
                reader.GetInt64(0),
                (ContentType)reader.GetInt32(1),
                reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetInt64(4),
                reader.GetDateTime(5),
                reader.IsDBNull(6) ? null : reader.GetDateTime(6)
                );
        }

        return null;
    }
    
    public async Task<CreateUpdateCommentDto?> CreateReplyComment(long commentId, long parentCommentId, Guid userId, 
        ContentType contentType, string content)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(
                "SELECT * FROM main.create_reply_comment(@commentId, @userId, @parentCommentId, @contentType, @content)");
        
        command.Parameters.AddWithValue("@commentId", commentId);
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@contentType", contentType);
        command.Parameters.AddWithValue("@content", content);
        command.Parameters.AddWithValue("@parentCommentId", parentCommentId);
        
        
        await using var reader = await command.ExecuteReaderAsync();

        if (await reader.ReadAsync())
        {
            return new CreateUpdateCommentDto(
                reader.GetInt64(0),
                (ContentType)reader.GetInt32(1),
                reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetInt64(4),
                reader.GetDateTime(5),
                reader.IsDBNull(6) ? null : reader.GetDateTime(6)
            );
        }

        return null;
    }
    
    public async Task<CreateUpdateCommentDto?> UpdateComment(long commentId, Guid userId, ContentType contentType, string content)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(
                "SELECT * FROM main.update_comment(@commentId, @userId, @contentType, @content)");

        command.Parameters.AddWithValue("@commentId", commentId);
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@contentType", contentType);
        command.Parameters.AddWithValue("@content", content);
        
        
        await using var reader = await command.ExecuteReaderAsync();

        if (await reader.ReadAsync())
        {
            return new CreateUpdateCommentDto(
                reader.GetInt64(0),
                (ContentType)reader.GetInt32(1),
                reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetInt64(4),
                reader.GetDateTime(5),
                reader.IsDBNull(6) ? null : reader.GetDateTime(6)
            );
        }

        return null;
    }

    public async Task<bool> DeleteComment(long commentId, Guid userId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(
                "SELECT * FROM main.delete_comment(@commentId, @userId)");
        
        command.Parameters.AddWithValue("@commentId", commentId);
        command.Parameters.AddWithValue("@userId", userId);

        var result = await command.ExecuteScalarAsync();
        if (result == null)
        {
            return false;
        }
        return (bool)result;
    }
    
}