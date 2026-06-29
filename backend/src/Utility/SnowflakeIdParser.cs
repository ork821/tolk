namespace TolkApi.Utility;

public static class SnowflakeIdParser
{
    public static bool TryParse(string? value, out long id)
    {
        return long.TryParse(value, out id) && id > 0;
    }
}
