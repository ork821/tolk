namespace TolkApi.Donations;

public sealed record YooMoneyNotification(
    string OperationId,
    Guid? UserId,
    decimal Amount,
    decimal WithdrawAmount,
    DateTimeOffset OccurredAt,
    string NotificationType);
