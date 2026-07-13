using System.ComponentModel.DataAnnotations;
using Npgsql;

namespace TolkApi.Users.DTO;

public record UpdateProfileInfoDto(
    [property: Required]
    Guid Id,
    [property: Required]
    string Username,
    [property: Required]
    string DisplayName,
    string? Email,
    string? Description,
    string? AvatarUrl,
    [property: Required]
    long Karma,
    [property: Required]
    long SubscribersCount,
    [property: Required]
    long UserSubscribesCount,
    [property: Required]
    long GroupSubscribesCount
)
{
    public static UpdateProfileInfoDto FromReader(NpgsqlDataReader reader)
    {
        return new UpdateProfileInfoDto(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.IsDBNull(3) ? null : reader.GetString(3),
            reader.IsDBNull(4) ? null : reader.GetString(4),
            reader.IsDBNull(5) ? null : reader.GetString(5),
            reader.GetInt64(6),
            reader.GetInt64(7),
            reader.GetInt64(8),
            reader.GetInt64(9)
        );
    }
}
