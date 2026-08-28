using TolkApi.Database;
using TolkApi.DTO;
using TolkApi.Posts;

namespace TolkApi.Comments;

public class CommentsService(DatabaseContext databaseContext)
{

    public async Task<CommentEntity[]> GetCommentReplies(long commentId, int limit, DateTime? lastCreatedAt,
        long? lastId, CancellationToken cancellationToken)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(
                "SELECT * FROM main.get_reply_comments(@commentId, @limit, @lastCreatedAt,  @lastId)");
        
        command.Parameters.AddWithValue("@commentId", commentId);
        command.Parameters.AddWithValue("@limit", limit);
        command.Parameters.AddWithValue("@lastCreatedAt", lastCreatedAt == null ? DBNull.Value : lastCreatedAt);
        command.Parameters.AddWithValue("@lastId", lastId == null ? DBNull.Value : lastId);
        
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var comments = new List<CommentEntity>();
        while (await reader.ReadAsync(cancellationToken))
        {
            comments.Add(CommentEntity.FromReader(reader));
        }
        return comments.ToArray();
    }

    public async Task<CreateUpdateCommentDto?> CreateComment(long postId, long commentId, Guid userId, 
        int contentType, string content, CancellationToken cancellationToken)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(
                "SELECT * FROM main.create_comment(@postId, @commentId, @userId, @contentType, @content)");
        
        command.Parameters.AddWithValue("@postId", postId);
        command.Parameters.AddWithValue("@commentId", commentId);
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@contentType", (int)contentType);
        command.Parameters.AddWithValue("@content", content);
        
        
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadCreateUpdateComment(reader);
        }

        return null;
    }
    
    public async Task<CreateUpdateCommentDto?> CreateReplyComment(long commentId, long parentCommentId, Guid userId, 
        int contentType, string content, CancellationToken cancellationToken)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(
                "SELECT * FROM main.create_reply_comment(@commentId, @userId, @parentCommentId, @contentType, @content)");
        
        command.Parameters.AddWithValue("@commentId", commentId);
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@contentType", contentType);
        command.Parameters.AddWithValue("@content", content);
        command.Parameters.AddWithValue("@parentCommentId", parentCommentId);
        
        
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadCreateUpdateComment(reader);
        }

        return null;
    }
    
    public async Task<CreateUpdateCommentDto?> UpdateComment(long commentId, Guid userId, int contentType,
        string content, CancellationToken cancellationToken)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(
                "SELECT * FROM main.update_comment(@commentId, @userId, @contentType, @content)");

        command.Parameters.AddWithValue("@commentId", commentId);
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@contentType", contentType);
        command.Parameters.AddWithValue("@content", content);
        
        
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadCreateUpdateComment(reader);
        }

        return null;
    }

    public async Task<bool> DeleteComment(long commentId, Guid userId, CancellationToken cancellationToken)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(
                "SELECT * FROM main.delete_comment(@commentId, @userId)");
        
        command.Parameters.AddWithValue("@commentId", commentId);
        command.Parameters.AddWithValue("@userId", userId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        if (result == null)
        {
            return false;
        }
        return (bool)result;
    }

    private static CreateUpdateCommentDto ReadCreateUpdateComment(Npgsql.NpgsqlDataReader reader)
    {
        return new CreateUpdateCommentDto(
            reader.GetInt64(0).ToString(),
            (ContentType)reader.GetInt32(1),
            reader.GetString(2),
            reader.IsDBNull(3) ? null : reader.GetInt64(3).ToString(),
            reader.GetDateTime(4),
            reader.IsDBNull(5) ? null : reader.GetDateTime(5)
        );
    }
    
}
