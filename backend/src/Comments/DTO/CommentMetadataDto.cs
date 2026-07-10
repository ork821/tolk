using System.ComponentModel.DataAnnotations;
using TolkApi.Reactions.DTO;

namespace TolkApi.Comments.DTO;

public class GetCommentsMetadataRequestDto
{
    [Required]
    public required string[] CommentIds { get; init; }
}

public record CommentMetadataDto(
    [property: Required]
    string Id,
    [property: Required]
    GetReactionsDto[] Reactions
);
