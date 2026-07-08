using System.ComponentModel.DataAnnotations;
using TolkApi.Reactions.DTO;

namespace TolkApi.Posts.DTO;

public class GetPostsMetadataRequestDto
{
    [Required]
    public required string[] PostIds { get; init; }
}

public record PostPermissionsDto(
    [property: Required]
    bool CanEdit,
    [property: Required]
    bool CanDelete
);

public record PostMetadataDto(
    [property: Required]
    string Id,
    [property: Required]
    GetReactionsDto[] Reactions,
    [property: Required]
    PostPermissionsDto Permissions
);
