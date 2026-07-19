namespace TolkApi.Donations;

public sealed class YooMoneyOptions
{
    public const string SectionName = "YooMoney";

    public string NotificationSecret { get; init; } = string.Empty;
}
