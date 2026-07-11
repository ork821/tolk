using System.ComponentModel.DataAnnotations;
using TolkApi.Reactions.DTO;

namespace TolkApi.Posts.DTO;

public record PostPermissionsDto(
    [property: Required]
    bool CanUpdate,
    [property: Required]
    bool CanDelete
);

public record PostMetadataDto(
    [property: Required]
    GetReactionsDto[] Reactions,
    [property: Required]
    PostPermissionsDto Permissions
);
