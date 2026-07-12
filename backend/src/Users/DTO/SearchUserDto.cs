using System.ComponentModel.DataAnnotations;
using Npgsql;

namespace TolkApi.Users.DTO;

public record SearchUserDto(
    [property: Required]
    string Username,
    [property: Required]
    string DisplayName,
    string? AvatarUrl,
    [property: Required]
    long SubscribersCount,
    [property: Required]
    bool IsSubscribed,
    [property: Required]
    bool IsMe
)
{
    public static SearchUserDto FromReader(NpgsqlDataReader reader)
    {
        return new SearchUserDto(
            reader.GetString(0),
            reader.GetString(1),
            reader.IsDBNull(2) ? null : reader.GetString(2),
            reader.GetInt64(3),
            reader.GetBoolean(4),
            reader.GetBoolean(5)
        );
    }
}
