using System.ComponentModel.DataAnnotations;
using Npgsql;

namespace TolkApi.Users.DTO;

public record GetUserFollowersDto(
    [property: Required]
    string Username,
    [property: Required]
    string DisplayName,
    [property: Required]
    bool IsSubscribed,
    [property: Required]
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
