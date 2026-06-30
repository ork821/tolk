using System.ComponentModel.DataAnnotations;
using Npgsql;

namespace TolkApi.Users.DTO;

public record GetUserFollowsDto(
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
    public static GetUserFollowsDto FromReader(NpgsqlDataReader reader)
    {
        return new GetUserFollowsDto(
            reader.GetString(0),
            reader.GetString(1),
            reader.GetBoolean(2),
            reader.GetDateTime(3)
        );
    }
}
