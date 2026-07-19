using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TolkApi.Donations;

[ApiController]
[ApiVersion(1.0)]
[Route("v{version:apiVersion}/donations")]
public sealed class DonationsController(
    YooMoneyNotificationService notificationService,
    ILogger<DonationsController> logger) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("yoomoney/notifications")]
    [Consumes("application/x-www-form-urlencoded")]
    [RequestSizeLimit(16 * 1024)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> ReceiveYooMoneyNotification(CancellationToken cancellationToken)
    {
        if (!notificationService.IsConfigured)
        {
            logger.LogError("YooMoney notification received, but NotificationSecret is not configured");
            return StatusCode(StatusCodes.Status503ServiceUnavailable);
        }

        if (!Request.HasFormContentType)
            return BadRequest();

        var form = await Request.ReadFormAsync(cancellationToken);
        if (!notificationService.TryValidate(form, out var notification, out var error))
        {
            logger.LogWarning(
                "Rejected YooMoney notification: {Reason}; remote IP {RemoteIpAddress}",
                error,
                HttpContext.Connection.RemoteIpAddress);
            return BadRequest();
        }

        await notificationService.HandleAsync(notification!, cancellationToken);
        return Ok();
    }
}
