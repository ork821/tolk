namespace TolkApi.Auth.Providers.DTO;

public record ValidateTokenDto(Guid UserId, bool Revoked, bool IsValid);