using System.ComponentModel.DataAnnotations;
using FluentValidation;
using TolkApi.Utility;

namespace TolkApi.DTO;

public record MetadataRequestDto(
    [property: Required]
    string[] Ids
);

public class MetadataRequestDtoValidator : AbstractValidator<MetadataRequestDto>
{
    public MetadataRequestDtoValidator()
    {
        RuleFor(x => x.Ids)
            .NotNull()
            .WithMessage("Ids are required")
            .Must(ids => ids.Length <= MetadataBatchLimits.MaxInputItems)
            .WithMessage($"Maximum metadata batch size is {MetadataBatchLimits.MaxInputItems}");
    }
}
