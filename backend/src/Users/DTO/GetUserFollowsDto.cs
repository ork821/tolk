using Npgsql;

namespace TolkApi.Users.DTO;

public record GetUserFollowsDto(
    string Username,
    string DisplayName,
    DateTime CreatedAt
)
{
    public static GetUserFollowsDto FromReader(NpgsqlDataReader reader)
    {
        return new GetUserFollowsDto(
            reader.GetString(0),
            reader.GetString(1),
            reader.GetDateTime(2)
            );
    }
}
