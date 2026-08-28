using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using TolkApi.DTO;
using TolkApi.Users.DTO;
using TolkApi.Utility;

namespace TolkApi.Users;

[ApiController]
[ApiVersion(1.0)]
[Route("v{version:apiVersion}/[controller]")]
public class UsersController(UsersService usersService) : ControllerBase
{
    private const int PageSize = 20;
    private const int SearchLimit = 20;

    [HttpGet("search")]
    [ProducesResponseType(typeof(SearchUserDto[]), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SearchUsers(
        [FromQuery(Name = "q")] string query,
        [FromUserId] Guid? userId,
        CancellationToken cancellationToken)
    {
        var normalizedQuery = query.Trim();
        if (normalizedQuery.Length < 2) return BadRequest("Search query must be at least 2 characters long");

        var users = await usersService.SearchUsers(normalizedQuery, SearchLimit, userId, cancellationToken);

        return Ok(users);
    }

    [HttpGet("{username}/posts")]
    [ProducesResponseType(typeof(PagedPostsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetUserPosts(
        [FromRoute] string username,
        [FromQuery(Name = "next_page_token")] string? nextPageToken,
        CancellationToken cancellationToken)
    {
        PostDto[] posts;
        if (nextPageToken != null)
        {
            var decodeResult = CursorEncoder.Decode(nextPageToken);
            if (decodeResult.lastCreatedAt == null || decodeResult.lastId == null)
                return BadRequest("Invalid next page token");
            posts = await usersService.GetUserPosts(username, PageSize + 1, decodeResult.lastCreatedAt,
                decodeResult.lastId, cancellationToken);
        }
        else
        {
            posts = await usersService.GetUserPosts(username, PageSize + 1, null, null, cancellationToken);
        }

        var postsPage = posts.Take(PageSize).ToArray();
        var nextToken = posts.Length <= PageSize
            ? null
            : CursorEncoder.Encode(postsPage.Last().CreatedAt, postsPage.Last().Id);
        // РџРѕР»СѓС‡РµРЅРёРµ СЃС‚РµРЅС‹ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
        return Ok(new PagedPostsDto(postsPage, nextToken));
    }

    [HttpGet("{username}/replies")]
    [ProducesResponseType(typeof(PagedPostsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetUserReplies(
        [FromRoute] string username,
        [FromQuery(Name = "next_page_token")] string? nextPageToken,
        CancellationToken cancellationToken)
    {
        PostDto[] replies;
        if (nextPageToken != null)
        {
            var decodeResult = CursorEncoder.Decode(nextPageToken);
            if (decodeResult.lastCreatedAt == null || decodeResult.lastId == null)
                return BadRequest("Invalid next page token");

            replies = await usersService.GetUserReplies(username, PageSize + 1, decodeResult.lastCreatedAt,
                decodeResult.lastId, cancellationToken);
        }
        else
        {
            replies = await usersService.GetUserReplies(username, PageSize + 1, null, null, cancellationToken);
        }

        var repliesPage = replies.Take(PageSize).ToArray();
        var nextToken = replies.Length <= PageSize
            ? null
            : CursorEncoder.Encode(repliesPage.Last().CreatedAt, repliesPage.Last().Id);

        return Ok(new PagedPostsDto(repliesPage, nextToken));
    }
    
    [HttpGet("{username}/reacts")]
    [ProducesResponseType(typeof(PagedPostsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetUserReactedPosts(
        [FromRoute] string username,
        [FromQuery(Name = "next_page_token")] string? nextPageToken,
        CancellationToken cancellationToken)
    {
        PostDto[] replies;
        if (nextPageToken != null)
        {
            var decodeResult = CursorEncoder.Decode(nextPageToken);
            if (decodeResult.lastCreatedAt == null || decodeResult.lastId == null)
                return BadRequest("Invalid next page token");

            replies = await usersService.GetUserReactedPosts(username, PageSize + 1, decodeResult.lastCreatedAt,
                decodeResult.lastId, cancellationToken);
        }
        else
        {
            replies = await usersService.GetUserReactedPosts(username, PageSize + 1, null, null, cancellationToken);
        }

        var repliesPage = replies.Take(PageSize).ToArray();
        var nextToken = replies.Length <= PageSize
            ? null
            : CursorEncoder.Encode(repliesPage.Last().CreatedAt, repliesPage.Last().Id);

        return Ok(new PagedPostsDto(repliesPage, nextToken));
    }

    [HttpGet("{username}")]
    [ProducesResponseType(typeof(GetUserByUsernameDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUserProfileInfo(string username, [FromUserId] Guid? userId,
        CancellationToken cancellationToken)
    {
        var userInfo = await usersService.GetUserByUsername(username, userId, cancellationToken);
        if (userInfo == null) return NotFound();
        return Ok(userInfo);
    }

    [HttpPost("metadata")]
    [ProducesResponseType(typeof(Dictionary<string, UserMetadataDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsersMetadata(
        [FromBody] MetadataRequestDto body,
        [FromUserId] Guid? userId,
        CancellationToken cancellationToken)
    {
        var validator = new MetadataRequestDtoValidator();
        var validationResult = await validator.ValidateAsync(body, cancellationToken);
        if (!validationResult.IsValid) return BadRequest(validationResult.ToString());

        if (body.Ids.Length == 0) return Ok(new Dictionary<string, UserMetadataDto>());

        var metadata = await usersService.GetUsersMetadata(
            body.Ids.Distinct(StringComparer.OrdinalIgnoreCase).ToArray(),
            userId,
            cancellationToken);

        return Ok(metadata);
    }

    // [IsAuthenticated]
    // [HttpGet("{username}/subscribe")]
    // public async Task<IActionResult> IsSubscribed(string username, [FromClaim(ClaimTypes.NameIdentifier)] string userId)
    // {
    //     var user = Guid.Parse(userId);
    //     var isUserSubscribed = await usersService.IsUserSubscribed(user, username);
    //     return Ok(new { Result = isUserSubscribed });
    // }

    [IsAuthenticated]
    [HttpPost("{username}/subscribe")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SubscribeToUser([FromRoute] string username,
        [FromUserId] Guid? userId,
        CancellationToken cancellationToken)
    {
        if (userId == null)
        {
            return Unauthorized();
        }
        var result = await usersService.SubscribeToUser((Guid)userId, username, cancellationToken);
        if (result)
        {
            return Created();
        }

        return BadRequest();
    }

    [IsAuthenticated]
    [HttpDelete("{username}/subscribe")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UnsubscribeFromUser([FromRoute] string username,
        [FromUserId] Guid? userId,
        CancellationToken cancellationToken)
    {
        if (userId == null)
        {
            return Unauthorized();
        }
        var result = await usersService.UnsubscribeFromUser((Guid)userId, username, cancellationToken);
        if (result)
        {
            return Created();
        }

        return BadRequest();
    }

    [HttpGet("{username}/subscribes/users")]
    [ProducesResponseType(typeof(PagedUserSubscribesDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetUserSubscribes(
        [FromRoute] string username,
        [FromQuery(Name = "next_page_token")] string? nextPageToken,
        [FromUserId] Guid? myUserId,
        CancellationToken cancellationToken)
    {
        GetUserSubscribesDto[] subscribes;
        if (nextPageToken != null)
        {
            var decodeResult = CursorEncoder.DecodeText(nextPageToken);
            if (decodeResult.lastCreatedAt == null || decodeResult.lastValue == null)
                return BadRequest("Invalid next page token");

            subscribes = await usersService.GetUserSubscribes(username, PageSize + 1, decodeResult.lastCreatedAt,
                decodeResult.lastValue, myUserId, cancellationToken);
        }
        else
        {
            subscribes = await usersService.GetUserSubscribes(username, PageSize + 1, null, null, myUserId,
                cancellationToken);
        }

        var subscribesPage = subscribes.Take(PageSize).ToArray();
        var nextToken = subscribes.Length <= PageSize
            ? null
            : CursorEncoder.Encode(subscribesPage.Last().CreatedAt, subscribesPage.Last().Username);

        return Ok(new PagedUserSubscribesDto(subscribesPage, nextToken));
    }

    [HttpGet("{username}/subscribes/groups")]
    [ProducesResponseType(typeof(PagedUserGroupSubscribesDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetGroupSubscribes(
        [FromRoute] string username,
        [FromQuery(Name = "next_page_token")] string? nextPageToken,
        CancellationToken cancellationToken)
    {
        GetUserGroupSubscribesDto[] groupSubscribes;
        if (nextPageToken != null)
        {
            var decodeResult = CursorEncoder.DecodeText(nextPageToken);
            if (decodeResult.lastCreatedAt == null || decodeResult.lastValue == null)
                return BadRequest("Invalid next page token");

            groupSubscribes = await usersService.GetUserGroupSubscribes(username, PageSize + 1,
                decodeResult.lastCreatedAt, decodeResult.lastValue, cancellationToken);
        }
        else
        {
            groupSubscribes = await usersService.GetUserGroupSubscribes(username, PageSize + 1, null, null,
                cancellationToken);
        }

        var groupSubscribesPage = groupSubscribes.Take(PageSize).ToArray();
        var nextToken = groupSubscribes.Length <= PageSize
            ? null
            : CursorEncoder.Encode(groupSubscribesPage.Last().CreatedAt, groupSubscribesPage.Last().Alias);

        return Ok(new PagedUserGroupSubscribesDto(groupSubscribesPage, nextToken));
    }

    [HttpGet("{username}/subscribers")]
    [ProducesResponseType(typeof(PagedUserSubscribersDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetUserSubscribers(
        [FromRoute] string username,
        [FromQuery(Name = "next_page_token")] string? nextPageToken,
        [FromUserId] Guid? myUserId,
        CancellationToken cancellationToken)
    {
        GetUserSubscribersDto[] subscribers;
        if (nextPageToken != null)
        {
            var decodeResult = CursorEncoder.DecodeText(nextPageToken);
            if (decodeResult.lastCreatedAt == null || decodeResult.lastValue == null)
                return BadRequest("Invalid next page token");

            subscribers = await usersService.GetUserSubscribers(username, PageSize + 1, decodeResult.lastCreatedAt,
                decodeResult.lastValue, myUserId, cancellationToken);
        }
        else
        {
            subscribers = await usersService.GetUserSubscribers(username, PageSize + 1, null, null, myUserId,
                cancellationToken);
        }

        var subscribersPage = subscribers.Take(PageSize).ToArray();
        var nextToken = subscribers.Length <= PageSize
            ? null
            : CursorEncoder.Encode(subscribersPage.Last().CreatedAt, subscribersPage.Last().Username);

        return Ok(new PagedUserSubscribersDto(subscribersPage, nextToken));
    }
}
