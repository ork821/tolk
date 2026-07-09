using System.ComponentModel.DataAnnotations;
using Npgsql;

namespace TolkApi.Users.DTO;

public record GetUserSubscribersDto(
    [property: Required]
    string Username,
    [property: Required]
    string DisplayName,
    string? AvatarUrl,
    [property: Required]
    bool IsSubscribed,
    [property: Required]
    DateTime CreatedAt
)
{
    public static GetUserSubscribersDto FromReader(NpgsqlDataReader reader)
    {
        return new GetUserSubscribersDto(
            reader.GetString(0),
            reader.GetString(1),
            reader.IsDBNull(2) ? null : reader.GetString(2),
            reader.GetBoolean(3),
            reader.GetDateTime(4)
        );
    }
}
