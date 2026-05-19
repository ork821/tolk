using Npgsql;

namespace TolkApi.Users.DTO;

public record GetUserByUsernameDto(
    Guid Id,
    string Username,
    string DisplayName,
    string? Email,
    string? Description,
    long Karma,
    long FollowersCount,
    long FollowUserCount,
    long FollowGroupsCount
)
{
    public static GetUserByUsernameDto FromReader(NpgsqlDataReader reader)
    {
        return new GetUserByUsernameDto(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.IsDBNull(3) ? null : reader.GetString(3),
            reader.IsDBNull(4) ? null : reader.GetString(4),
            reader.GetInt64(5),
            reader.GetInt64(6),
            reader.GetInt64(7),
            reader.GetInt64(8)
        );
    }
}
