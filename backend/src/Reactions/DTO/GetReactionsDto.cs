using System.ComponentModel.DataAnnotations;

namespace TolkApi.Reactions.DTO;

public record GetReactionsDto(
    [property: Required]
    string Name,
    [property: Required]
    long Count
);
