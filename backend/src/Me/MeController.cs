using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using MindzBackDotNet.DTO;
using MindzBackDotNet.Utility;

namespace MindzBackDotNet.Me;

[ApiController]
[ApiVersion(1.0)]
[Route("v{version:apiVersion}/[controller]")]
// [Authorize] - Здесь должен быть атрибут проверки токена
public class MeController : ControllerBase
{
    [IsAuthenticated]
    [HttpGet("feed")]
    public async Task<IActionResult> GetMyFeed(
        [FromQuery] PaginationDto pagination,
        [FromUserId] Guid userId
    )
    {
        // ID текущего пользователя берется не из параметров, а из Claims Principal
        // var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        // Логика сборки персональной ленты
        return Ok(new { Items = new object[] { }, NextCursor = "encoded_cursor_string" });
    }
}