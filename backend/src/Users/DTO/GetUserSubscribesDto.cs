using System.ComponentModel.DataAnnotations;
using Npgsql;

namespace TolkApi.Users.DTO;

public record GetUserSubscribesDto(
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
    public static GetUserSubscribesDto FromReader(NpgsqlDataReader reader)
    {
        return new GetUserSubscribesDto(
            reader.GetString(0),
            reader.GetString(1),
            reader.IsDBNull(2) ? null : reader.GetString(2),
            reader.GetBoolean(3),
            reader.GetDateTime(4)
        );
    }
}
