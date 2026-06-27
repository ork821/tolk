using System.ComponentModel.DataAnnotations;

namespace TolkApi.Reactions.DTO;

public record ReactionTypeDto(
    [property: Required]
    string Name,
    [property: Required]
    double Weight,
    string? Icon
);
