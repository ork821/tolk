using FluentValidation;

namespace TolkApi.Auth.DTO;

public class RestoreAccountDto
{
    public required string RecoveryToken { get; init; }
}

public class RestoreAccountDtoValidator : AbstractValidator<RestoreAccountDto>
{
    public RestoreAccountDtoValidator()
    {
        RuleFor(x => x.RecoveryToken)
            .NotEmpty()
            .MaximumLength(4096);
    }
}
