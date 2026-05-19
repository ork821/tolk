using Npgsql;

namespace TolkApi.Users.DTO;

public record GetUserFollowersDto(
    string Username,
    string DisplayName,
    bool IsSubscribed,
    DateTime CreatedAt
)
{
    public static GetUserFollowersDto FromReader(NpgsqlDataReader reader)
    {
        return new GetUserFollowersDto(
            reader.GetString(0),
            reader.GetString(1),
            reader.GetBoolean(2),
            reader.GetDateTime(3)
        );
    }
}
