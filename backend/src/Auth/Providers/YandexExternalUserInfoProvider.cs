using System.Net.Http.Headers;
using System.Text.Json;
using TolkApi.Auth.Providers.DTO;

namespace TolkApi.Auth.Providers;

public class YandexExternalUserInfoProvider(
    HttpClient httpClient,
    ILogger<YandexExternalUserInfoProvider> logger) : IAbstractExternalUserInfoProvider
{
    public async Task<SocialProfileInfo?> GetUserInfo(string token, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "info");
        request.Headers.Authorization = new AuthenticationHeaderValue("OAuth", token);

        using var response = await httpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning(
                "Yandex user info request failed with status {StatusCode}",
                response.StatusCode);
            return null;
        }

        try
        {
            var json = await response.Content.ReadFromJsonAsync<JsonElement>(
                cancellationToken: cancellationToken);
            var id = json.GetProperty("id").GetString();
            var username = json.GetProperty("login").GetString();
            var email = json.TryGetProperty("default_email", out var emailProperty) &&
                        emailProperty.ValueKind != JsonValueKind.Null
                ? emailProperty.GetString()
                : null;

            if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(username))
            {
                logger.LogWarning("Yandex user info response is missing required fields");
                return null;
            }

            return new SocialProfileInfo(id, username, email, null, null);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "Failed to parse Yandex user info response");
            return null;
        }
    }
}
