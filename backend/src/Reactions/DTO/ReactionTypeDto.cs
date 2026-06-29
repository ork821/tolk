using System.ComponentModel.DataAnnotations;

namespace TolkApi.Reactions.DTO;

public record ReactionTypeDto(
    [Required]
    string Name,
    [Required]
    double Weight,
    string? Icon
);
