using MindzBackDotNet.Auth.Providers.DTO;
using MindzBackDotNet.Database;

namespace MindzBackDotNet.Auth;

public class AuthService(DatabaseContext databaseContext)
{
    public async Task<bool> SaveRefreshToken(Guid userId, string refreshToken, int days, string userAgent)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand("SELECT * FROM users.save_refresh_token(@userId, @refreshToken, @days, @userAgent)");

        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@refreshToken", refreshToken);
        command.Parameters.AddWithValue("@days", days);
        command.Parameters.AddWithValue("@userAgent", userAgent);

        try
        {
            var result = await command.ExecuteNonQueryAsync();
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
        await using var command = databaseContext.GetCon()
            .CreateCommand("SELECT * FROM users.validate_refresh_token(@refreshToken)");

        command.Parameters.AddWithValue("@refreshToken", refreshToken);

        await using var reader = await command.ExecuteReaderAsync();

        if (await reader.ReadAsync())
            return new ValidateTokenDto(
                reader.GetGuid(0),
                reader.GetBoolean(1),
                reader.GetBoolean(2)
            );

        return null;
    }

    public async Task<bool> RevokeRefreshToken(string refreshToken)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand("SELECT * FROM users.revoke_refresh_token(@refreshToken)");

        command.Parameters.AddWithValue("@refreshToken", refreshToken);

        var result = await command.ExecuteScalarAsync();
        if (result == null) return false;

        return (bool)result;
    }


    public async Task<bool> RevokeAllRefreshTokens(Guid userId, string? refreshToken)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand("SELECT * FROM users.revoke_all_refresh_tokens(@userId, @refreshToken)");

        command.Parameters.AddWithValue("@userId", userId);
        command.Parameters.AddWithValue("@refreshToken", refreshToken == null ? DBNull.Value : refreshToken);

        var result = await command.ExecuteScalarAsync();
        if (result == null) return false;

        return (bool)result;
    }


    public async Task<ExternalOAuthLoginDto?> LoginOAuth(string provider,
        string externalId, string? username,
        string? email, string? displayName)
    {
        await using var command = databaseContext.GetCon()
            .CreateCommand("SELECT * FROM users.login_oauth(@provider, @externalId, @username, @email, @displayName)");
        
        command.Parameters.AddWithValue("@provider", provider);
        command.Parameters.AddWithValue("@externalId", externalId);
        command.Parameters.AddWithValue("@username", username);
        command.Parameters.AddWithValue("@email", email);
        command.Parameters.AddWithValue("@displayName", displayName);
        
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