using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace TolkApi.DTO;

public record PaginationDto(
    [FromQuery(Name = "last_post_id")] long LastPostId,
    [FromQuery(Name = "limit")] int Limit = 20
);

public class PaginationValidator : AbstractValidator<PaginationDto>
{
    public PaginationValidator()
    {
        RuleFor(x => x.Limit)
            .GreaterThanOrEqualTo(10)
            .LessThanOrEqualTo(50)
            .WithMessage("Limit must be greater than or equal to 10 and  less than or equal to 50.");
    }
}