using System.ComponentModel.DataAnnotations;

namespace TolkApi.Reactions.DTO;

public class GetPostReactionsBatchRequestDto
{
    [Required]
    public required string[] PostIds { get; init; }
}

public record GetPostReactionsBatchDto(
    [property: Required]
    string PostId,
    [property: Required]
    GetReactionsDto[] Reactions
);
