using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using TolkApi.DTO;
using TolkApi.Posts;
using TolkApi.Utility;

namespace TolkApi.Feed;

[ApiController]
[ApiVersion(1.0)]
[Route("v{version:apiVersion}/feed")]
public class FeedController(PostsService postsService) : ControllerBase
{
    private const int PageSize = 20;

    [HttpGet]
    [ProducesResponseType(typeof(PagedPostsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetFeed([FromQuery(Name = "next_page_token")] string? nextPageToken)
    {
        var lastCreatedAt = (DateTime?)null;
        var lastId = (long?)null;

        if (nextPageToken != null)
        {
            var decodeResult = CursorEncoder.Decode(nextPageToken);
            if (decodeResult.lastCreatedAt == null || decodeResult.lastId == null)
            {
                return BadRequest("Invalid next page token");
            }

            lastCreatedAt = decodeResult.lastCreatedAt;
            lastId = decodeResult.lastId;
        }

        var posts = await postsService.GetFeed(PageSize + 1, lastCreatedAt, lastId);
        var page = posts.Take(PageSize).ToArray();
        var nextToken = posts.Length <= PageSize
            ? null
            : CursorEncoder.Encode(page.Last().CreatedAt, page.Last().Id);

        return Ok(new PagedPostsDto(page, nextToken));
    }
}
