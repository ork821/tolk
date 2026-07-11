using TolkApi.Database;
using TolkApi.Reactions.DTO;
using NpgsqlTypes;

using TolkApi.Comments.DTO;

namespace TolkApi.Reactions;

public class ReactionService(DatabaseContext databaseContext)
{
    public async Task<ReactionTypeDto[]> GetReactionTypes()
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand("SELECT * FROM main.get_active_reactions()");

        await using var reader = await command.ExecuteReaderAsync();
        var reactionTypes = new List<ReactionTypeDto>();

        while (await reader.ReadAsync())
        {
            reactionTypes.Add(new ReactionTypeDto(
                reader.GetString(0),
                reader.GetDouble(1),
                reader.IsDBNull(2) ? null : reader.GetString(2)));
        }

        return reactionTypes.ToArray();
    }


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
            .CreateCommand(@"SELECT * FROM main.delete_comment_reactions(@commentId, @userId, @reaction)");
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
            reactions.Add(new GetReactionsDto(reader.GetString(0), reader.GetInt64(1), false));
        }
        return reactions.ToArray();
    }

    public async Task<GetCommentReactionsBatchDto[]> GetCommentReactions(long[] commentIds, Guid? userId = null)
    {
        if (commentIds.Length == 0)
        {
            return [];
        }

        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.get_comments_reactions(@commentIds, @userId)");
        command.Parameters.Add("commentIds", NpgsqlDbType.Array | NpgsqlDbType.Bigint).Value = commentIds;
        command.Parameters.Add("userId", NpgsqlDbType.Uuid).Value = userId.HasValue ? userId.Value : DBNull.Value;

        await using var reader = await command.ExecuteReaderAsync();
        var reactionsByCommentId = new Dictionary<long, List<GetReactionsDto>>();

        foreach (var commentId in commentIds)
        {
            reactionsByCommentId.TryAdd(commentId, []);
        }

        while (await reader.ReadAsync())
        {
            var commentId = reader.GetInt64(0);
            if (!reactionsByCommentId.TryGetValue(commentId, out var reactions))
            {
                reactions = [];
                reactionsByCommentId[commentId] = reactions;
            }

            reactions.Add(new GetReactionsDto(
                reader.GetString(1),
                reader.GetInt64(2),
                reader.GetBoolean(3)));
        }

        return commentIds
            .Select(commentId => new GetCommentReactionsBatchDto(commentId.ToString(), reactionsByCommentId[commentId].ToArray()))
            .ToArray();
    }
    
    public async Task<GetReactionsDto[]> GetPostReactions(long postId, Guid? userId = null)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.get_post_reactions(@postId, @userId)");
        command.Parameters.AddWithValue("@postId", postId);
        command.Parameters.Add("@userId", NpgsqlDbType.Uuid).Value = userId.HasValue ? userId.Value : DBNull.Value;

        await using var reader = await command.ExecuteReaderAsync();
        var reactions = new List<GetReactionsDto>();

        while (await reader.ReadAsync())
        {
            reactions.Add(new GetReactionsDto(reader.GetString(0), reader.GetInt64(1), reader.GetBoolean(2)));
        }
        return reactions.ToArray();
    }

    public async Task<GetPostReactionsBatchDto[]> GetPostReactions(long[] postIds, Guid? userId = null)
    {
        if (postIds.Length == 0)
        {
            return [];
        }

        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.get_posts_reactions(@postIds, @userId)");
        command.Parameters.Add("postIds", NpgsqlDbType.Array | NpgsqlDbType.Bigint).Value = postIds;
        command.Parameters.Add("userId", NpgsqlDbType.Uuid).Value = userId.HasValue ? userId.Value : DBNull.Value;

        await using var reader = await command.ExecuteReaderAsync();
        var reactionsByPostId = new Dictionary<long, List<GetReactionsDto>>();

        foreach (var postId in postIds)
        {
            reactionsByPostId.TryAdd(postId, []);
        }

        while (await reader.ReadAsync())
        {
            var postId = reader.GetInt64(0);
            if (!reactionsByPostId.TryGetValue(postId, out var reactions))
            {
                reactions = [];
                reactionsByPostId[postId] = reactions;
            }

            reactions.Add(new GetReactionsDto(
                reader.GetString(1),
                reader.GetInt64(2),
                reader.GetBoolean(3)));
        }

        return postIds
            .Select(postId => new GetPostReactionsBatchDto(postId.ToString(), reactionsByPostId[postId].ToArray()))
            .ToArray();
    }

    public async Task<Dictionary<long, TolkApi.Posts.DTO.PostPermissionsDto>> GetPostPermissions(long[] postIds, Guid userId)
    {
        var permissionsByPostId = new Dictionary<long, TolkApi.Posts.DTO.PostPermissionsDto>();
        foreach (var postId in postIds)
        {
            permissionsByPostId.TryAdd(postId, new TolkApi.Posts.DTO.PostPermissionsDto(false, false));
        }

        if (postIds.Length == 0)
        {
            return permissionsByPostId;
        }

        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.get_posts_permissions(@postIds, @userId)");
        command.Parameters.Add("postIds", NpgsqlDbType.Array | NpgsqlDbType.Bigint).Value = postIds;
        command.Parameters.Add("userId", NpgsqlDbType.Uuid).Value = userId;

        await using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            permissionsByPostId[reader.GetInt64(0)] = new TolkApi.Posts.DTO.PostPermissionsDto(
                reader.GetBoolean(1),
                reader.GetBoolean(2));
        }

        return permissionsByPostId;
    }

    public async Task<Dictionary<long, CommentPermissionsDto>> GetCommentPermissions(long[] commentIds, Guid userId)
    {
        var permissionsByCommentId = new Dictionary<long, CommentPermissionsDto>();
        foreach (var commentId in commentIds)
        {
            permissionsByCommentId.TryAdd(commentId, new CommentPermissionsDto(false, false));
        }

        if (commentIds.Length == 0)
        {
            return permissionsByCommentId;
        }

        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.get_comments_permissions(@commentIds, @userId)");
        command.Parameters.Add("commentIds", NpgsqlDbType.Array | NpgsqlDbType.Bigint).Value = commentIds;
        command.Parameters.Add("userId", NpgsqlDbType.Uuid).Value = userId;

        await using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            permissionsByCommentId[reader.GetInt64(0)] = new CommentPermissionsDto(
                reader.GetBoolean(1),
                reader.GetBoolean(2));
        }

        return permissionsByCommentId;
    }
}
