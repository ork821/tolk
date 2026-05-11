using System.Text;

namespace TolkApi.Utility;

public static class CursorEncoder
{
    // Упаковываем данные из последнего поста в выдаче
    public static string Encode(DateTime lastCreatedAt, long lastId)
    {
        // Формируем строку: "1712250000|12345" (UnixTimeMilliseconds|Id)
        var cursorStr = $"{lastCreatedAt.Millisecond}|{lastId}";

        // Переводим в Base64, чтобы клиент видел просто "MTcxMjI1MDAwMHwxMjM0NQ=="
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(cursorStr));
    }

    // Распаковываем токен, пришедший от клиента
    public static (DateTime? lastCreatedAt, long? lastId) Decode(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return (null, null);

        try
        {
            var cursorStr = Encoding.UTF8.GetString(Convert.FromBase64String(token));
            var parts = cursorStr.Split('|');

            if (parts.Length == 2 &&
                long.TryParse(parts[0], out var unixTime) &&
                long.TryParse(parts[1], out var id))
                return (DateTimeOffset.FromUnixTimeMilliseconds(unixTime).UtcDateTime, id);
        }
        catch
        {
            // Если хакер прислал мусор вместо Base64, игнорируем или кидаем ошибку валидации 400
        }

        return (null, null);
    }
}