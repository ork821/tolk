using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;

namespace TolkApi.Reactions;

[ApiController]
[ApiVersion(1.0)]
[Route("v{version:apiVersion}/reaction-types")]
public class ReactionsController(ReactionService reactionService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetReactionTypes()
    {
        var reactionTypes = await reactionService.GetReactionTypes();
        return Ok(reactionTypes);
    }
}
