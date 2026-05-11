using Npgsql;

namespace MindzBackDotNet.Users.DTO;

public record GetUserFollowersDto(
    string Username,
    string DisplayName,
    bool IsSubscribed
)
{
    public static GetUserFollowersDto FromReader(NpgsqlDataReader reader)
    {
        return new GetUserFollowersDto(
            reader.GetString(0),
            reader.GetString(1),
            reader.GetBoolean(2)
        );
    }
}