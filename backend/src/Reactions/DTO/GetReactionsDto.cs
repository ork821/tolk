using System.ComponentModel.DataAnnotations;

namespace TolkApi.Reactions.DTO;

public record GetReactionsDto(
    [Required]
    string Name,
    [Required]
    long Count
);
