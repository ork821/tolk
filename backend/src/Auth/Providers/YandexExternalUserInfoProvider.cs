using System.Net.Http.Headers;
using System.Text.Json;
using TolkApi.Auth.Providers.DTO;

namespace TolkApi.Auth.Providers;

public class YandexExternalUserInfoProvider(HttpClient httpClient) : IAbstractExternalUserInfoProvider
{
    public async Task<SocialProfileInfo?> GetUserInfo(string token)
    {
        // Эндпоинт Яндекс.ID для получения информации о пользователе
        var request = new HttpRequestMessage(HttpMethod.Get, "info");

        // ВАЖНО: Схема авторизации у Яндекса - "OAuth", а не "Bearer"
        request.Headers.Authorization = new AuthenticationHeaderValue("OAuth", token);

        // Отправляем запрос
        var response = await httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            Console.WriteLine("Ошибка получения данных от Яндекса. Статус: {Status}. Ответ: {Error}",
                response.StatusCode, errorContent);
            return null; // Токен невалидный, просрочен или отозван
        }

        // Парсим ответ без создания жестких C# классов под ответ Яндекса
        // JsonElement работает очень быстро и экономит память
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();

        try
        {
            // Извлекаем поля согласно официальной документации Яндекса
            var id = json.GetProperty("id").GetString();

            // У пользователя может не быть имени, тогда берем логин
            var name = json.GetProperty("login").GetString();

            // Email может быть скрыт настройками приватности, проверяем безопасно
            var email = json.TryGetProperty("default_email", out var emailProp) &&
                        emailProp.ValueKind != JsonValueKind.Null
                ? emailProp.GetString()
                : null;


            if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(name))
            {
                Console.WriteLine("Яндекс вернул успешный ответ, но отсутствуют обязательные поля id или name.");
                return null;
            }

            return new SocialProfileInfo(id, name, email, null, null);
        }
        catch (Exception ex)
        {
            Console.WriteLine("Ошибка парсинга JSON от Яндекса.", ex);
            return null;
        }
    }
}
