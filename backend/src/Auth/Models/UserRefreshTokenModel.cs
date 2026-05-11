namespace MindzBackDotNet.Auth.Models;

public record UserRefreshTokenModel
{
    public Guid Id { get; set; }

    public DateTime Expires { get; set; }
}