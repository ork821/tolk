using System.Text;

namespace TolkApi.Utility;

public static class CursorEncoder
{
    // Упаковываем данные из последнего поста в выдаче
    public static string Encode(DateTime lastCreatedAt, long lastId)
    {
        var utcCreatedAt = lastCreatedAt.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(lastCreatedAt, DateTimeKind.Utc)
            : lastCreatedAt.ToUniversalTime();
        var cursorStr = $"{utcCreatedAt.Ticks}|{lastId}";

        // Переводим в Base64, чтобы клиент видел просто "MTcxMjI1MDAwMHwxMjM0NQ=="
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(cursorStr));
    }

    public static string Encode(DateTime lastCreatedAt, string lastValue)
    {
        var utcCreatedAt = lastCreatedAt.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(lastCreatedAt, DateTimeKind.Utc)
            : lastCreatedAt.ToUniversalTime();
        var cursorStr = $"{utcCreatedAt.Ticks}|{lastValue}";

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
                long.TryParse(parts[0], out var timestamp) &&
                long.TryParse(parts[1], out var id))
                return (DecodeTimestamp(timestamp), id);
        }
        catch
        {
            // Если хакер прислал мусор вместо Base64, игнорируем или кидаем ошибку валидации 400
        }

        return (null, null);
    }

    public static (DateTime? lastCreatedAt, string? lastValue) DecodeText(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return (null, null);

        try
        {
            var cursorStr = Encoding.UTF8.GetString(Convert.FromBase64String(token));
            var parts = cursorStr.Split('|', 2);

            if (parts.Length == 2 &&
                long.TryParse(parts[0], out var timestamp) &&
                !string.IsNullOrWhiteSpace(parts[1]))
                return (DecodeTimestamp(timestamp), parts[1]);
        }
        catch
        {
            // Invalid Base64 or malformed cursor.
        }

        return (null, null);
    }

    private static DateTime DecodeTimestamp(long timestamp)
    {
        return timestamp > 10_000_000_000_000_000
            ? new DateTime(timestamp, DateTimeKind.Utc)
            : DateTimeOffset.FromUnixTimeMilliseconds(timestamp).UtcDateTime;
    }
}
