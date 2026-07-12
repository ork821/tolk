using System.ComponentModel.DataAnnotations;
using TolkApi.Reactions.DTO;

namespace TolkApi.Comments.DTO;

public record CommentMetadataDto(
    [property: Required]
    GetReactionsDto[] Reactions,
    [property: Required]
    CommentPermissionsDto Permissions
);

public record CommentPermissionsDto(
    [property: Required]
    bool CanUpdate,
    [property: Required]
    bool CanDelete,
    [property: Required]
    bool CanReply
);
