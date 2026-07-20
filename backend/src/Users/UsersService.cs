using TolkApi.Database;
using TolkApi.DTO;
using TolkApi.Users.DTO;
using NpgsqlTypes;

namespace TolkApi.Users;

public class UsersService(DatabaseContext databaseContext, ILogger<UsersService> logger)
{
    public async Task<DateTime?> DeleteUser(Guid userId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand("SELECT users.delete_user(@userId)");

        command.Parameters.Add("userId", NpgsqlDbType.Uuid).Value = userId;
        var result = await command.ExecuteScalarAsync();

        return result is DateTime deletedAt ? deletedAt : null;
    }

    public async Task<bool> RestoreUser(Guid userId, DateTime expectedDeletedAt)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand("SELECT users.restore_user(@userId, @expectedDeletedAt)");

        command.Parameters.Add("userId", NpgsqlDbType.Uuid).Value = userId;
        command.Parameters.Add("expectedDeletedAt", NpgsqlDbType.TimestampTz).Value = expectedDeletedAt;

        return await command.ExecuteScalarAsync() is true;
    }

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
    
    public async Task<PostDto[]> GetUserReactedPosts(string username, int limit, DateTime? lastCreatedAt, long? lastId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM main.get_user_reacted_posts(@username, @limit, @lastCreatedAt, @lastId)");

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

    public async Task<GetUserByUsernameDto?> GetUserByUsername(string username, Guid? userId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM users.get_user_by_username(@username, @userId)");

        command.Parameters.AddWithValue("@username", username);
        command.Parameters.AddWithValue("@userId", userId != null ? userId : DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync();

        if (await reader.ReadAsync()) return GetUserByUsernameDto.FromReader(reader);

        return null;
    }

    public async Task<Dictionary<string, UserMetadataDto>> GetUsersMetadata(string[] usernames, Guid? userId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM users.get_users_metadata(@usernames, @userId)");

        command.Parameters.AddWithValue("@usernames", usernames);
        command.Parameters.AddWithValue("@userId", userId != null ? userId : DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync();

        var usersMetadata = new Dictionary<string, UserMetadataDto>(StringComparer.OrdinalIgnoreCase);

        while (await reader.ReadAsync()) usersMetadata[reader.GetString(0)] = UserMetadataDto.FromReader(reader);

        return usersMetadata;
    }

    public async Task<SearchUserDto[]> SearchUsers(string query, int limit, Guid? userId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM users.search_users(@query, @limit, @userId)");

        command.Parameters.AddWithValue("@query", query);
        command.Parameters.AddWithValue("@limit", limit);
        command.Parameters.AddWithValue("@userId", userId != null ? userId : DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync();

        var users = new List<SearchUserDto>();
        while (await reader.ReadAsync()) users.Add(SearchUserDto.FromReader(reader));

        return users.ToArray();
    }

    public async Task<UpdateProfileInfoDto?> UpdateProfileInfo(
        Guid userId,
        string? displayName,
        string? description,
        string? avatarUrl)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand("""
                           SELECT *
                           FROM users.update_profile_info(
                               p_user_id => @userId,
                               p_display_name => @displayName,
                               p_description => @description,
                               p_avatar_url => @avatarUrl
                           )
                           """);

        command.Parameters.Add("userId", NpgsqlDbType.Uuid).Value = userId;
        command.Parameters.Add("displayName", NpgsqlDbType.Text).Value = displayName != null ? displayName : DBNull.Value;
        command.Parameters.Add("description", NpgsqlDbType.Text).Value = description != null ? description : DBNull.Value;
        command.Parameters.Add("avatarUrl", NpgsqlDbType.Text).Value = avatarUrl != null ? avatarUrl : DBNull.Value;

        await using var reader = await command.ExecuteReaderAsync();

        if (await reader.ReadAsync()) return UpdateProfileInfoDto.FromReader(reader);

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

    public async Task<GetUserSubscribersDto[]> GetUserSubscribers(
        string username,
        int limit,
        DateTime? lastCreatedAt,
        string? lastUsername,
        Guid? myUserId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM users.get_user_subscribers(@username, @limit, @lastCreatedAt, @lastUsername, @myUserId)");

        command.Parameters.AddWithValue("@username", username);
        command.Parameters.AddWithValue("@limit", limit);
        command.Parameters.AddWithValue("@lastCreatedAt", lastCreatedAt != null ? lastCreatedAt : DBNull.Value);
        command.Parameters.AddWithValue("@lastUsername", lastUsername != null ? lastUsername : DBNull.Value);
        command.Parameters.AddWithValue("@myUserId", myUserId != null ? myUserId : DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync();

        var subscribers = new List<GetUserSubscribersDto>();

        while (await reader.ReadAsync()) subscribers.Add(GetUserSubscribersDto.FromReader(reader));

        return subscribers.ToArray();
    }


    public async Task<GetUserSubscribesDto[]> GetUserSubscribes(
        string username,
        int limit,
        DateTime? lastCreatedAt,
        string? lastUsername,
        Guid? myUserId)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM users.get_user_subscribes(@username, @limit, @lastCreatedAt, @lastUsername, @myUserId)");

        command.Parameters.AddWithValue("@username", username);
        command.Parameters.AddWithValue("@limit", limit);
        command.Parameters.AddWithValue("@lastCreatedAt", lastCreatedAt != null ? lastCreatedAt : DBNull.Value);
        command.Parameters.AddWithValue("@lastUsername", lastUsername != null ? lastUsername : DBNull.Value);
        command.Parameters.AddWithValue("@myUserId", myUserId != null ? myUserId : DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync();

        var subscribes = new List<GetUserSubscribesDto>();

        while (await reader.ReadAsync()) subscribes.Add(GetUserSubscribesDto.FromReader(reader));

        return subscribes.ToArray();
    }

    public async Task<GetUserGroupSubscribesDto[]> GetUserGroupSubscribes(
        string username,
        int limit,
        DateTime? lastCreatedAt,
        string? lastAlias)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM users.get_user_group_subscribes(@username, @limit, @lastCreatedAt, @lastAlias)");

        command.Parameters.AddWithValue("@username", username);
        command.Parameters.AddWithValue("@limit", limit);
        command.Parameters.AddWithValue("@lastCreatedAt", lastCreatedAt != null ? lastCreatedAt : DBNull.Value);
        command.Parameters.AddWithValue("@lastAlias", lastAlias != null ? lastAlias : DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync();

        var subscribes = new List<GetUserGroupSubscribesDto>();

        while (await reader.ReadAsync()) subscribes.Add(new GetUserGroupSubscribesDto(reader.GetString(0), reader.GetDateTime(1)));

        return subscribes.ToArray();
    }


    public async Task<bool> IsUserSubscribed(Guid userId, string username)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM users.is_user_subscribed(@userId, @username)");

        command.Parameters.AddWithValue("@username", username);
        command.Parameters.AddWithValue("@userId", userId);

        await using var reader = await command.ExecuteReaderAsync();

        return await reader.ReadAsync() && reader.GetBoolean(0);
    }

    public async Task<bool> SubscribeToUser(Guid userId, string username)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM users.add_user_subscribe(@userId, @username)");

        command.Parameters.AddWithValue("@username", username);
        command.Parameters.AddWithValue("@userId", userId);

        try
        {
            await command.ExecuteNonQueryAsync();

            return true;
        }
        catch (Exception e)
        {
            logger.LogError(
                e,
                "Failed to subscribe user {UserId} to {TargetUsername}",
                userId,
                username);
            return false;
        }
    }

    public async Task<bool> UnsubscribeFromUser(Guid userId, string username)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand(@"SELECT * FROM users.remove_user_subscribe(@userId, @username)");

        command.Parameters.AddWithValue("@username", username);
        command.Parameters.AddWithValue("@userId", userId);

        try
        {
            await command.ExecuteNonQueryAsync();

            return true;
        }
        catch (Exception e)
        {
            logger.LogError(
                e,
                "Failed to unsubscribe user {UserId} from {TargetUsername}",
                userId,
                username);
            return false;
        }
    }
}
