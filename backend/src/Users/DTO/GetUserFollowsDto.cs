using Npgsql;

namespace MindzBackDotNet.Users.DTO;

public record GetUserFollowsDto(
    string Username,
    string DisplayName
)
{
    public static GetUserFollowsDto FromReader(NpgsqlDataReader reader)
    {
        return new GetUserFollowsDto(
            reader.GetString(0),
            reader.GetString(1)
            );
    }
}