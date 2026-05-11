namespace MindzBackDotNet.Auth.Providers.DTO;

public record ExternalOAuthLoginDto(Guid UserId, string Username, bool IsNew);