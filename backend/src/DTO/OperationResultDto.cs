using System.ComponentModel.DataAnnotations;

namespace TolkApi.DTO;

public record OperationResultDto(
    [property: Required]
    bool Result
);
