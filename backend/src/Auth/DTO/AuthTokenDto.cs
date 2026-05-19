namespace TolkApi.Auth.DTO;

public record AuthTokenDto(
    string AccessToken,
    DateTime Expires
);
