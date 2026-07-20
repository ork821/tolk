using System.ComponentModel.DataAnnotations;

namespace TolkApi.Auth.DTO;

public record DeletedAccountDto(
    [property: Required]
    string Code,
    [property: Required]
    bool CanRestore,
    [property: Required]
    DateTime RestoreUntil,
    string? RecoveryToken
);
