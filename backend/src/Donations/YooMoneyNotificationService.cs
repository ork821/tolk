using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using NpgsqlTypes;
using TolkApi.Database;

namespace TolkApi.Donations;

public sealed class YooMoneyNotificationService(
    IOptions<YooMoneyOptions> options,
    DatabaseContext databaseContext,
    ILogger<YooMoneyNotificationService> logger)
{
    private const string RubCurrencyCode = "643";
    private static readonly HashSet<string> SupportedNotificationTypes =
        ["p2p-incoming", "card-incoming"];

    private readonly YooMoneyOptions _options = options.Value;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_options.NotificationSecret);

    public bool TryValidate(
        IFormCollection form,
        out YooMoneyNotification? notification,
        out string error)
    {
        notification = null;

        if (!IsConfigured)
        {
            error = "YooMoney notifications are not configured";
            return false;
        }

        if (!TryGetSingleValue(form, "sign", out var suppliedSignature))
        {
            error = "The notification signature is missing or invalid";
            return false;
        }

        if (!HasValidSignature(form, suppliedSignature))
        {
            error = "The notification signature is invalid";
            return false;
        }

        if (!TryGetSingleValue(form, "operation_id", out var operationId) ||
            string.IsNullOrWhiteSpace(operationId) || operationId.Length > 128)
        {
            error = "The operation identifier is invalid";
            return false;
        }

        if (!TryGetSingleValue(form, "notification_type", out var notificationType) ||
            !SupportedNotificationTypes.Contains(notificationType))
        {
            error = "The notification type is unsupported";
            return false;
        }

        if (!TryGetSingleValue(form, "currency", out var currency) || currency != RubCurrencyCode)
        {
            error = "The notification currency is unsupported";
            return false;
        }

        if (!TryReadPositiveAmount(form, "amount", out var amount) ||
            !TryReadPositiveAmount(form, "withdraw_amount", out var withdrawAmount))
        {
            error = "The notification amount is invalid";
            return false;
        }

        if (!TryGetSingleValue(form, "datetime", out var dateTimeValue) ||
            !DateTimeOffset.TryParse(
                dateTimeValue,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var occurredAt))
        {
            error = "The notification date is invalid";
            return false;
        }

        if (!TryReadFalse(form, "codepro") || !TryReadFalse(form, "unaccepted"))
        {
            error = "Protected or unaccepted transfers are not supported";
            return false;
        }

        if (!TryGetSingleValue(form, "label", out var label))
        {
            error = "The notification label is invalid";
            return false;
        }

        Guid? userId = null;
        if (!string.IsNullOrWhiteSpace(label))
        {
            if (!Guid.TryParse(label, out var parsedUserId))
            {
                error = "The notification label must contain a user identifier";
                return false;
            }

            userId = parsedUserId;
        }

        notification = new YooMoneyNotification(
            operationId,
            userId,
            amount,
            withdrawAmount,
            occurredAt,
            notificationType);
        error = string.Empty;
        return true;
    }

    public async Task<bool> HandleAsync(
        YooMoneyNotification notification,
        CancellationToken cancellationToken)
    {
        await using var connection = await databaseContext.GetCon().OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT main.record_donation(@operationId, @userId, @amount, @withdrawAmount, @notificationType, @occurredAt)";
        command.Parameters.Add("operationId", NpgsqlDbType.Text).Value = notification.OperationId;
        command.Parameters.Add("userId", NpgsqlDbType.Uuid).Value = notification.UserId.HasValue
            ? notification.UserId.Value
            : DBNull.Value;
        command.Parameters.Add("amount", NpgsqlDbType.Numeric).Value = notification.Amount;
        command.Parameters.Add("withdrawAmount", NpgsqlDbType.Numeric).Value = notification.WithdrawAmount;
        command.Parameters.Add("notificationType", NpgsqlDbType.Text).Value = notification.NotificationType;
        command.Parameters.Add("occurredAt", NpgsqlDbType.TimestampTz).Value = notification.OccurredAt;

        var inserted = (bool)(await command.ExecuteScalarAsync(cancellationToken) ?? false);

        logger.LogInformation(
            "Processed YooMoney donation {OperationId}: user {UserId}, amount {Amount}, inserted {Inserted}",
            notification.OperationId,
            notification.UserId,
            notification.Amount,
            inserted);

        return inserted;
    }

    private bool HasValidSignature(IFormCollection form, string suppliedSignature)
    {
        if (form.Any(pair => pair.Value.Count != 1))
            return false;

        byte[] suppliedBytes;
        try
        {
            suppliedBytes = Convert.FromHexString(suppliedSignature);
        }
        catch (FormatException)
        {
            return false;
        }

        if (suppliedBytes.Length != 32)
            return false;

        var signaturePayload = string.Join(
            "&",
            form
                .Where(pair => !string.Equals(pair.Key, "sign", StringComparison.Ordinal))
                .OrderBy(pair => pair.Key, StringComparer.Ordinal)
                .Select(pair => $"{pair.Key}={Uri.EscapeDataString(pair.Value[0] ?? string.Empty)}"));

        var expectedBytes = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(_options.NotificationSecret),
            Encoding.UTF8.GetBytes(signaturePayload));

        return CryptographicOperations.FixedTimeEquals(expectedBytes, suppliedBytes);
    }

    private static bool TryGetSingleValue(IFormCollection form, string key, out string value)
    {
        value = string.Empty;
        if (!form.TryGetValue(key, out var values) || values.Count != 1)
            return false;

        value = values[0] ?? string.Empty;
        return true;
    }

    private static bool TryReadPositiveAmount(IFormCollection form, string key, out decimal amount)
    {
        amount = 0;
        return TryGetSingleValue(form, key, out var value) &&
               decimal.TryParse(value, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out amount) &&
               amount > 0;
    }

    private static bool TryReadFalse(IFormCollection form, string key)
    {
        return TryGetSingleValue(form, key, out var value) &&
               bool.TryParse(value, out var parsed) &&
               !parsed;
    }
}
