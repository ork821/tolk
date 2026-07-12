using TolkApi.Database;
using TolkApi.DTO;
using TolkApi.Posts.DTO;

namespace TolkApi.Posts;

public class PostsService(DatabaseContext databaseContext)
{
    public async Task<CreateUpdatePostDto?> CreatePost(long id, Guid userId, long? parentPostId, int contentType,
        string content)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand("""
                           SELECT *
                           FROM main.create_post(
                               p_id => @id,
                               p_user_id => @userId,
                               p_parent_post_id => @parentId,
                               p_content_type => @contentType,
                               p_content => @content,
                               p_title => @title
                           )
                           """);

        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@parentId", parentPostId != null ? parentPostId : DBNull.Value);
        command.Parameters.AddWithValue("@contentType", contentType);
        command.Parameters.AddWithValue("@content", content);
        command.Parameters.AddWithValue("@title", DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync();

        if (await reader.ReadAsync())
            return new CreateUpdatePostDto(
                reader.GetInt64(0).ToString(),
                reader.IsDBNull(1) ? null : reader.GetInt64(1).ToString(),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.GetInt32(3),
                reader.GetString(4)
            );

        return null;
    }


    public async Task<CreateUpdatePostDto?> UpdatePost(long id, Guid userId, int contentType, string content)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand("""
                           SELECT *
                           FROM main.update_post(
                               p_id => @id,
                               p_user_id => @userId,
                               p_content_type => @contentType,
                               p_content => @content,
                               p_title => @title
                           )
                           """);

        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@contentType", contentType);
        command.Parameters.AddWithValue("@content", content);
        command.Parameters.AddWithValue("@title", DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync();

        if (await reader.ReadAsync())
            return new CreateUpdatePostDto(
                reader.GetInt64(0).ToString(),
                reader.IsDBNull(1) ? null : reader.GetInt64(1).ToString(),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.GetInt32(3),
                reader.GetString(4)
            );

        return null;
    }

    public async Task<bool> DeletePost(long id, Guid userId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.delete_post(@postId, @userId)");
        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@postId", id);

        var result = (bool)await command.ExecuteScalarAsync();
        return result;
    }

    public async Task<PostDto?> GetPost(long post)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.get_post(@postId)");
        command.Parameters.AddWithValue("@postId", post);

        await using var reader = await command.ExecuteReaderAsync();


        if (await reader.ReadAsync()) return PostDto.FromReader(reader);

        return null;
    }

    public async Task<PostDto[]> GetPostThread(long post)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.get_post_thread(@postId)");
        command.Parameters.AddWithValue("@postId", post);

        await using var reader = await command.ExecuteReaderAsync();

        var posts = new List<PostDto>();
        while (await reader.ReadAsync()) posts.Add(PostDto.FromReader(reader));

        return posts.ToArray();
    }

    public async Task<PostDto[]> GetFeed(int limit, DateTime? lastCreatedAt, long? lastId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.get_feed(@limit, @lastCreatedAt, @lastId)");

        command.Parameters.AddWithValue("@limit", limit);
        command.Parameters.AddWithValue("@lastCreatedAt", lastCreatedAt == null ? DBNull.Value : lastCreatedAt);
        command.Parameters.AddWithValue("@lastId", lastId == null ? DBNull.Value : lastId);

        await using var reader = await command.ExecuteReaderAsync();

        var posts = new List<PostDto>();
        while (await reader.ReadAsync()) posts.Add(PostDto.FromReader(reader));

        return posts.ToArray();
    }

    public async Task<CommentEntity[]> GetPostComments(long postId,
        int limit, DateTime? lastCreatedAt, long? lastId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand("SELECT * FROM main.get_post_comments(@postId, @limit, @lastCreatedAt,  @lastId)");

        command.Parameters.AddWithValue("@postId", postId);
        command.Parameters.AddWithValue("@limit", limit);
        command.Parameters.AddWithValue("@lastCreatedAt", lastCreatedAt == null ? DBNull.Value : lastCreatedAt);
        command.Parameters.AddWithValue("@lastId", lastId == null ? DBNull.Value : lastId);

        await using var reader = await command.ExecuteReaderAsync();

        var comments = new List<CommentEntity>();
        
        while (await reader.ReadAsync()) 
            comments.Add(CommentEntity.FromReader(reader));

        return comments.ToArray();
    }
}
