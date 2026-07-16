namespace TolkApi.Auth.Models;

public record RotateRefreshTokenResult(
    Guid? UserId,
    bool IsRotated,
    bool ShouldRevokeAll
);
