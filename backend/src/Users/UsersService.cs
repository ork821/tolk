using TolkApi.Database;
using TolkApi.DTO;
using TolkApi.Users.DTO;

namespace TolkApi.Users;

public class UsersService(DatabaseContext databaseContext)
{
    public async Task<PostDto[]> GetUserPosts(string username, int limit, DateTime? lastCreatedAt, long? lastId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.get_user_posts(@username, @limit, @lastCreatedAt, @lastId)");

        command.Parameters.AddWithValue("@username", username);
        command.Parameters.AddWithValue("@limit", limit);
        command.Parameters.AddWithValue("@lastCreatedAt", lastCreatedAt != null ? lastCreatedAt : DBNull.Value);
        command.Parameters.AddWithValue("@lastId", lastId != null ? lastId : DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync();

        var posts = new List<PostDto>();

        while (await reader.ReadAsync())
        {
            posts.Add(PostDto.FromReader(reader));
        }

        return posts.ToArray();
    }

    public async Task<PostDto[]> GetUserReplies(string username, int limit, DateTime? lastCreatedAt, long? lastId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.get_user_replies(@username, @limit, @lastCreatedAt, @lastId)");

        command.Parameters.AddWithValue("@username", username);
        command.Parameters.AddWithValue("@limit", limit);
        command.Parameters.AddWithValue("@lastCreatedAt", lastCreatedAt != null ? lastCreatedAt : DBNull.Value);
        command.Parameters.AddWithValue("@lastId", lastId != null ? lastId : DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync();

        var replies = new List<PostDto>();

        while (await reader.ReadAsync())
        {
            replies.Add(PostDto.FromReader(reader));
        }

        return replies.ToArray();
    }

    public async Task<GetUserByUsernameDto?> GetUserByUsername(string username)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM users.get_user_by_username(@username)");

        command.Parameters.AddWithValue("@username", username);

        await using var reader = await command.ExecuteReaderAsync();

        if (await reader.ReadAsync()) return GetUserByUsernameDto.FromReader(reader);

        return null;
    }

    public async Task<GetUserByUsernameDto?> GetUserById(Guid userId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM users.get_user_by_id(@userId)");

        command.Parameters.AddWithValue("@userId", userId);

        await using var reader = await command.ExecuteReaderAsync();

        if (await reader.ReadAsync()) return GetUserByUsernameDto.FromReader(reader);

        return null;
    }

    public async Task<GetUserFollowersDto[]> GetUserFollowers(
        string username,
        int limit,
        DateTime? lastCreatedAt,
        string? lastUsername,
        Guid? myUserId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM users.get_user_followers(@username, @limit, @lastCreatedAt, @lastUsername, @myUserId)");

        command.Parameters.AddWithValue("@username", username);
        command.Parameters.AddWithValue("@limit", limit);
        command.Parameters.AddWithValue("@lastCreatedAt", lastCreatedAt != null ? lastCreatedAt : DBNull.Value);
        command.Parameters.AddWithValue("@lastUsername", lastUsername != null ? lastUsername : DBNull.Value);
        command.Parameters.AddWithValue("@myUserId", myUserId != null ? myUserId : DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync();

        var followers = new List<GetUserFollowersDto>();

        while (await reader.ReadAsync()) followers.Add(GetUserFollowersDto.FromReader(reader));

        return followers.ToArray();
    }


    public async Task<GetUserFollowsDto[]> GetUserFollows(
        string username,
        int limit,
        DateTime? lastCreatedAt,
        string? lastUsername,
        Guid? myUserId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM users.get_user_follows(@username, @limit, @lastCreatedAt, @lastUsername, @myUserId)");

        command.Parameters.AddWithValue("@username", username);
        command.Parameters.AddWithValue("@limit", limit);
        command.Parameters.AddWithValue("@lastCreatedAt", lastCreatedAt != null ? lastCreatedAt : DBNull.Value);
        command.Parameters.AddWithValue("@lastUsername", lastUsername != null ? lastUsername : DBNull.Value);
        command.Parameters.AddWithValue("@myUserId", myUserId != null ? myUserId : DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync();

        var followers = new List<GetUserFollowsDto>();

        while (await reader.ReadAsync()) followers.Add(GetUserFollowsDto.FromReader(reader));

        return followers.ToArray();
    }

    public async Task<GetUserFollowingGroupsDto[]> GetUserFollowingGroups(
        string username,
        int limit,
        DateTime? lastCreatedAt,
        string? lastAlias)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM users.get_user_group_follows(@username, @limit, @lastCreatedAt, @lastAlias)");

        command.Parameters.AddWithValue("@username", username);
        command.Parameters.AddWithValue("@limit", limit);
        command.Parameters.AddWithValue("@lastCreatedAt", lastCreatedAt != null ? lastCreatedAt : DBNull.Value);
        command.Parameters.AddWithValue("@lastAlias", lastAlias != null ? lastAlias : DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync();

        var followers = new List<GetUserFollowingGroupsDto>();

        while (await reader.ReadAsync()) followers.Add(new GetUserFollowingGroupsDto(reader.GetString(0), reader.GetDateTime(1)));

        return followers.ToArray();
    }


    public async Task<bool> IsUserFollows(Guid userId, string username)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM users.is_user_follows(@userId, @username)");

        command.Parameters.AddWithValue("@username", username);
        command.Parameters.AddWithValue("@userId", userId);

        await using var reader = await command.ExecuteReaderAsync();

        return await reader.ReadAsync() && reader.GetBoolean(0);
    }

    public async Task<bool> FollowUser(Guid userId, string username)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM users.add_follow_user(@userId, @username)");

        command.Parameters.AddWithValue("@username", username);
        command.Parameters.AddWithValue("@userId", userId);

        try
        {
            await command.ExecuteNonQueryAsync();

            return true;
        }
        catch (Exception e)
        {
            Console.WriteLine("Follow failed", e);
            return false;
        }
    }

    public async Task<bool> UnfollowUser(Guid userId, string username)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM users.remove_follow_user(@userId, @username)");

        command.Parameters.AddWithValue("@username", username);
        command.Parameters.AddWithValue("@userId", userId);

        try
        {
            await command.ExecuteNonQueryAsync();

            return true;
        }
        catch (Exception e)
        {
            Console.WriteLine("Unfollow failed", e);
            return false;
        }
    }
}
