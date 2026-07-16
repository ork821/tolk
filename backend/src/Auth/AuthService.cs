using System.Net;
using System.Security.Cryptography;
using System.Text;
using NpgsqlTypes;
using TolkApi.Auth.Models;
using TolkApi.Auth.Providers.DTO;
using TolkApi.Database;

namespace TolkApi.Auth;

public class AuthService(DatabaseContext databaseContext, AuthOptions authOptions)
{
    private string HashRefreshToken(string refreshToken)
    {
        var tokenBytes = Encoding.UTF8.GetBytes(refreshToken);
        var hashBytes = HMACSHA256.HashData(authOptions.GetRefreshTokenHashKey(), tokenBytes);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    public async Task<Guid?> CreateAuthSession(Guid userId, string userAgent, string? ipAddress)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand("SELECT users.create_auth_session(@userId, @userAgent, @ipAddress)");

        command.Parameters.Add("@userId", NpgsqlDbType.Uuid).Value = userId;
        command.Parameters.Add("@userAgent", NpgsqlDbType.Text).Value = userAgent;
        command.Parameters.Add("@ipAddress", NpgsqlDbType.Inet).Value =
            ParseIpAddress(ipAddress) ?? (object)DBNull.Value;

        var result = await command.ExecuteScalarAsync();
        return result is Guid sessionId ? sessionId : null;
    }

    public async Task<bool> SaveRefreshToken(Guid sessionId, string refreshToken, int days)
    {
        var refreshTokenHash = HashRefreshToken(refreshToken);
        await using var command = databaseContext.GetCon()
            .CreateCommand("SELECT * FROM users.save_refresh_token(@sessionId, @tokenHash, @days)");

        command.Parameters.Add("@sessionId", NpgsqlDbType.Uuid).Value = sessionId;
        command.Parameters.Add("@tokenHash", NpgsqlDbType.Text).Value = refreshTokenHash;
        command.Parameters.Add("@days", NpgsqlDbType.Integer).Value = days;

        try
        {
            await command.ExecuteNonQueryAsync();
            return true;
        }
        catch (Exception e)
        {
            Console.WriteLine("Failed save token", e);
            return false;
        }
    }

    public async Task<ValidateTokenDto?> ValidateRefreshToken(string refreshToken)
    {
        var refreshTokenHash = HashRefreshToken(refreshToken);
        await using var command = databaseContext.GetCon()
            .CreateCommand("SELECT * FROM users.validate_refresh_token(@refreshTokenHash)");

        command.Parameters.AddWithValue("@refreshTokenHash", refreshTokenHash);

        await using var reader = await command.ExecuteReaderAsync();

        if (await reader.ReadAsync())
            return new ValidateTokenDto(
                reader.GetGuid(0),
                reader.GetBoolean(1),
                reader.GetBoolean(2)
            );

        return null;
    }

    public async Task<RotateRefreshTokenResult?> RotateRefreshToken(
        string previousRefreshToken,
        string newRefreshToken,
        int days,
        string userAgent,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var previousTokenHash = HashRefreshToken(previousRefreshToken);
        var newTokenHash = HashRefreshToken(newRefreshToken);

        await using var command = databaseContext.GetCon()
            .CreateCommand("SELECT * FROM users.rotate_refresh_token(@previousTokenHash, @newTokenHash, @days, @userAgent, @ipAddress)");

        command.Parameters.AddWithValue("@previousTokenHash", previousTokenHash);
        command.Parameters.AddWithValue("@newTokenHash", newTokenHash);
        command.Parameters.AddWithValue("@days", days);
        command.Parameters.AddWithValue("@userAgent", userAgent);
        command.Parameters.Add("@ipAddress", NpgsqlDbType.Inet).Value =
            ParseIpAddress(ipAddress) ?? (object)DBNull.Value;

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken)) return null;

        return new RotateRefreshTokenResult(
            reader.IsDBNull(0) ? null : reader.GetGuid(0),
            reader.GetBoolean(1),
            reader.GetBoolean(2));
    }

    private static IPAddress? ParseIpAddress(string? ipAddress)
    {
        return IPAddress.TryParse(ipAddress, out var parsedIpAddress)
            ? parsedIpAddress
            : null;
    }

    public async Task<bool> RevokeRefreshToken(string refreshToken)
    {
        var refreshTokenHash = HashRefreshToken(refreshToken);
        await using var command = databaseContext.GetCon()
            .CreateCommand("SELECT * FROM users.revoke_refresh_token(@refreshTokenHash)");

        command.Parameters.AddWithValue("@refreshTokenHash", refreshTokenHash);

        var result = await command.ExecuteScalarAsync();
        if (result == null) return false;

        return (bool)result;
    }


    public async Task<bool> RevokeAllRefreshTokens(Guid userId, string? refreshToken)
    {
        var refreshTokenHash = refreshToken == null ? null : HashRefreshToken(refreshToken);
        await using var command = databaseContext.GetCon()
            .CreateCommand("SELECT users.revoke_all_refresh_tokens(@userId, @refreshTokenHash)");

        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@refreshTokenHash", refreshTokenHash == null ? DBNull.Value : refreshTokenHash);

        await command.ExecuteNonQueryAsync();
        return true;
    }


    public async Task<ExternalOAuthLoginDto?> LoginOAuth(string provider,
        string externalId, string? username,
        string? email, string? displayName, string? avatarUrl)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand("SELECT * FROM users.login_oauth(@provider, @externalId, @username, @email, @displayName, @avatarUrl)");
        
        command.Parameters.AddWithValue("@provider", provider);
        command.Parameters.AddWithValue("@externalId", externalId);
        command.Parameters.AddWithValue("@username", username == null ? DBNull.Value : username);
        command.Parameters.AddWithValue("@email", email ==  null ? DBNull.Value : email);
        command.Parameters.AddWithValue("@displayName", displayName == null ? DBNull.Value : displayName);
        command.Parameters.AddWithValue("@avatarUrl", avatarUrl == null ? DBNull.Value : avatarUrl);
        
        await using var reader = await command.ExecuteReaderAsync();

        if (await reader.ReadAsync())
        {
            return new ExternalOAuthLoginDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetBoolean(2)
                );
        }
        return null;
    }
}
