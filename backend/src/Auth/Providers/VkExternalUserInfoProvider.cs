using System.Net.Http.Headers;
using System.Text.Json;
using TolkApi.Auth.Providers.DTO;

namespace TolkApi.Auth.Providers;

public class VkExternalUserInfoProvider(
    HttpClient httpClient,
    ILogger<VkExternalUserInfoProvider> logger) : IAbstractExternalUserInfoProvider
{
    public async Task<SocialProfileInfo?> GetUserInfo(string token, CancellationToken cancellationToken)
    {
        const string url = "method/users.get?v=5.199&fields=screen_name,photo_200";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var response = await httpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning(
                "VK user info request failed with status {StatusCode}",
                response.StatusCode);
            return null;
        }

        try
        {
            var json = await response.Content.ReadFromJsonAsync<JsonElement>(
                cancellationToken: cancellationToken);

            if (json.TryGetProperty("error", out var errorElement))
            {
                var errorCode = errorElement.GetProperty("error_code").GetInt32();
                var errorMessage = errorElement.GetProperty("error_msg").GetString();

                logger.LogWarning(
                    "VK API returned error {ErrorCode}: {ErrorMessage}",
                    errorCode,
                    errorMessage);
                return null;
            }

            var users = json.GetProperty("response");
            if (users.GetArrayLength() == 0)
            {
                logger.LogWarning("VK user info response does not contain a user");
                return null;
            }

            var user = users[0];
            var id = user.GetProperty("id").GetInt64().ToString();
            var firstName = user.GetProperty("first_name").GetString();
            var lastName = user.GetProperty("last_name").GetString();
            var displayName = $"{firstName} {lastName}".Trim();
            var username = user.GetProperty("screen_name").GetString();

            string? avatarUrl = null;
            if (user.TryGetProperty("photo_200", out var photoProperty) &&
                photoProperty.ValueKind != JsonValueKind.Null)
            {
                avatarUrl = photoProperty.GetString();
                if (avatarUrl?.Contains("camera_200.png", StringComparison.Ordinal) == true)
                    avatarUrl = null;
            }

            return new SocialProfileInfo(id, username, null, displayName, avatarUrl);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "Failed to parse VK user info response");
            return null;
        }
    }
}
