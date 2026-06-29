using System.ComponentModel.DataAnnotations;
using Npgsql;

namespace TolkApi.Users.DTO;

public record GetUserFollowsDto(
    [Required]
    string Username,
    [Required]
    string DisplayName,
    [Required]
    bool IsSubscribed,
    [Required]
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
