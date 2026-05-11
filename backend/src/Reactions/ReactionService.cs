using MindzBackDotNet.Database;
using MindzBackDotNet.Reactions.DTO;

namespace MindzBackDotNet.Reactions;

public class ReactionService(DatabaseContext databaseContext)
{


    public async Task<bool> AddPostReaction(long postId, Guid userId, string reaction)
    {
        
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.add_post_reactions(@postId, @userId, @reaction)");
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@postId", postId);
        command.Parameters.AddWithValue("@reaction", reaction);

        
        var result = await command.ExecuteScalarAsync();
        if (result == null)
        {
            return false;
        }
        return (bool)result;
    
    }
    
    public async Task<bool> DeletePostReaction(long postId, Guid userId, string reaction)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.delete_post_reactions(@postId, @userId, @reaction)");
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@postId", postId);
        command.Parameters.AddWithValue("@reaction", reaction);

        
        var result = await command.ExecuteScalarAsync();
        if (result == null)
        {
            return false;
        }
        return (bool)result;
    }
    
    public async Task<bool> AddCommentReaction(long commentId, Guid userId, string reaction)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.add_comment_reactions(@commentId, @userId, @reaction)");
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@commentId", commentId);
        command.Parameters.AddWithValue("@reaction", reaction);

        
        var result = await command.ExecuteScalarAsync();
        if (result == null)
        {
            return false;
        }
        return (bool)result;
    }
    
    public async Task<bool> DeleteCommentReaction(long commentId, Guid userId, string reaction)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.delete_post_reactions(@commentId, @userId, @reaction)");
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@commentId", commentId);
        command.Parameters.AddWithValue("@reaction", reaction);

        
        var result = await command.ExecuteScalarAsync();
        if (result == null)
        {
            return false;
        }
        return (bool)result;
    }

    public async Task<GetReactionsDto[]> GetCommentReactions(long commentId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.get_comment_reactions(@commentId)");
        command.Parameters.AddWithValue("@commentId", commentId);

        await using var reader = await command.ExecuteReaderAsync();
        var reactions = new List<GetReactionsDto>();

        while (await reader.ReadAsync())
        {
            reactions.Add(new GetReactionsDto(reader.GetString(0),  reader.GetInt64(1)));
        }
        return reactions.ToArray();
    }
    
    public async Task<GetReactionsDto[]> GetPostReactions(long postId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.get_post_reactions(@postId)");
        command.Parameters.AddWithValue("@postId", postId);

        await using var reader = await command.ExecuteReaderAsync();
        var reactions = new List<GetReactionsDto>();

        while (await reader.ReadAsync())
        {
            reactions.Add(new GetReactionsDto(reader.GetString(0),  reader.GetInt64(1)));
        }
        return reactions.ToArray();
    }
}