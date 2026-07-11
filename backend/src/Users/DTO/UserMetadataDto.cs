using System.ComponentModel.DataAnnotations;
using Npgsql;

namespace TolkApi.Users.DTO;

public record UserMetadataDto(
    [property: Required]
    bool IsSubscribed,
    [property: Required]
    bool IsMe
)
{
    public static UserMetadataDto FromReader(NpgsqlDataReader reader)
    {
        return new UserMetadataDto(
            reader.GetBoolean(1),
            reader.GetBoolean(2)
        );
    }
}
