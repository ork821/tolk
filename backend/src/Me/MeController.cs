using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using TolkApi.Users;
using TolkApi.Users.DTO;
using TolkApi.Utility;

namespace TolkApi.Me;

[ApiController]
[ApiVersion(1.0)]
[Route("v{version:apiVersion}/me")]
public class MeController(UsersService usersService) : ControllerBase
{
    [IsAuthenticated]
    [HttpGet]
    [ProducesResponseType(typeof(GetUserByUsernameDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMe([FromUserId] Guid userId)
    {
        var user = await usersService.GetUserById(userId);
        if (user == null) return Unauthorized();

        return Ok(user);
    }
}
