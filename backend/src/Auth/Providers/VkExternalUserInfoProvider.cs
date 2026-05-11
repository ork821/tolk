using System.Net.Http.Headers;
using System.Text.Json;
using TolkApi.Auth.Providers.DTO;

namespace TolkApi.Auth.Providers;

public class VkExternalUserInfoProvider: IAbstractExternalUserInfoProvider
{
    public async Task<SocialProfileInfo?> GetUserInfo(string token)
    {
        var httpClient = new HttpClient();
        // Формируем URL. Просим VK вернуть аватарку (photo_200)
            var url = $"https://api.vk.com/method/users.get?v=5.199&fields=screen_name";
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            
            // В современных версиях VK API токен можно передавать по стандарту в заголовке Bearer
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await httpClient.SendAsync(request);

            // Эта проверка сработает только если упала сеть или сервер VK недоступен
            if (!response.IsSuccessStatusCode)
            {
                Console.WriteLine("Сетевая ошибка при обращении к VK API. Статус: {0}", response.StatusCode);
                return null; 
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>();

            // А вот здесь мы проверяем реальную логическую ошибку VK (например, невалидный токен)
            if (json.TryGetProperty("error", out var errorElement))
            {
                var errorCode = errorElement.GetProperty("error_code").GetInt32();
                var errorMsg = errorElement.GetProperty("error_msg").GetString();
                
                Console.WriteLine("VK API вернул ошибку. Код: {0}, Сообщение: {1}", errorCode, errorMsg);
                return null;
            }

            try
            {
                // Успешный ответ VK всегда лежит в массиве "response"
                var userArray = json.GetProperty("response");
                if (userArray.GetArrayLength() == 0)
                    return null;

                var user = userArray[0];

                // ID у ВК числовой, переводим в строку для универсальности
                var id = user.GetProperty("id").GetInt64().ToString(); 
                
                var firstName = user.GetProperty("first_name").GetString();
                var lastName = user.GetProperty("last_name").GetString();
                var fullName = $"{firstName} {lastName}".Trim();
                var username = user.GetProperty("screen_name").GetString();

                // string? avatarUrl = null;
                // if (user.TryGetProperty("photo_200", out var photoProp) && photoProp.ValueKind != JsonValueKind.Null)
                // {
                //     avatarUrl = photoProp.GetString();
                //     
                //     // ВК иногда отдает заглушку вместо реального фото, отфильтруем её (опционально)
                //     if (avatarUrl != null && avatarUrl.Contains("camera_200.png"))
                //     {
                //         avatarUrl = null;
                //     }
                // }

                // Email мы отсюда не достанем, передаем null. 
                // Если он нужен, его придется принимать отдельным параметром от фронтенда вместе с токеном.
                return new SocialProfileInfo(id, username, null, fullName);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Ошибка парсинга JSON успешного ответа от ВКонтакте.", ex);
                return null;
            }
    }
}