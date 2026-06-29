using System.ComponentModel.DataAnnotations;

namespace TolkApi.DTO;

public record OperationResultDto(
    [Required]
    bool Result
);
