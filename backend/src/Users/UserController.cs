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

    [HttpGet("{username}/posts")]
    [ProducesResponseType(typeof(PagedPostsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetUserPosts(
        [FromRoute] string username,
        [FromQuery(Name = "next_page_token")] string? nextPageToken)
    {
        PostDto[] posts;
        if (nextPageToken != null)
        {
            var decodeResult = CursorEncoder.Decode(nextPageToken);
            if (decodeResult.lastCreatedAt == null || decodeResult.lastId == null)
                return BadRequest("Invalid next page token");
            posts = await usersService.GetUserPosts(username, PageSize + 1, decodeResult.lastCreatedAt, decodeResult.lastId);
        }
        else
        {
            posts = await usersService.GetUserPosts(username, PageSize + 1, null, null);
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
        [FromQuery(Name = "next_page_token")] string? nextPageToken)
    {
        PostDto[] replies;
        if (nextPageToken != null)
        {
            var decodeResult = CursorEncoder.Decode(nextPageToken);
            if (decodeResult.lastCreatedAt == null || decodeResult.lastId == null)
                return BadRequest("Invalid next page token");

            replies = await usersService.GetUserReplies(username, PageSize + 1, decodeResult.lastCreatedAt, decodeResult.lastId);
        }
        else
        {
            replies = await usersService.GetUserReplies(username, PageSize + 1, null, null);
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
        [FromQuery(Name = "next_page_token")] string? nextPageToken)
    {
        PostDto[] replies;
        if (nextPageToken != null)
        {
            var decodeResult = CursorEncoder.Decode(nextPageToken);
            if (decodeResult.lastCreatedAt == null || decodeResult.lastId == null)
                return BadRequest("Invalid next page token");

            replies = await usersService.GetUserReactedPosts(username, PageSize + 1, decodeResult.lastCreatedAt, decodeResult.lastId);
        }
        else
        {
            replies = await usersService.GetUserReactedPosts(username, PageSize + 1, null, null);
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
    public async Task<IActionResult> GetUserProfileInfo(string username, [FromUserId] Guid? userId)
    {
        var userInfo = await usersService.GetUserByUsername(username, userId);
        if (userInfo == null) return NotFound();
        return Ok(userInfo);
    }

    [HttpPost("metadata")]
    [ProducesResponseType(typeof(UserMetadataDto[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsersMetadata(
        [FromBody] GetUsersMetadataRequestDto body,
        [FromUserId] Guid? userId)
    {
        if (body.Usernames.Length == 0) return Ok(Array.Empty<UserMetadataDto>());

        var metadata = await usersService.GetUsersMetadata(
            body.Usernames.Distinct(StringComparer.OrdinalIgnoreCase).ToArray(),
            userId);

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
        [FromUserId] Guid? userId)
    {
        if (userId == null)
        {
            return Unauthorized();
        }
        var result = await usersService.SubscribeToUser((Guid)userId, username);
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
        [FromUserId] Guid? userId)
    {
        if (userId == null)
        {
            return Unauthorized();
        }
        var result = await usersService.UnsubscribeFromUser((Guid)userId, username);
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
        [FromUserId] Guid? myUserId)
    {
        GetUserSubscribesDto[] subscribes;
        if (nextPageToken != null)
        {
            var decodeResult = CursorEncoder.DecodeText(nextPageToken);
            if (decodeResult.lastCreatedAt == null || decodeResult.lastValue == null)
                return BadRequest("Invalid next page token");

            subscribes = await usersService.GetUserSubscribes(username, PageSize + 1, decodeResult.lastCreatedAt, decodeResult.lastValue, myUserId);
        }
        else
        {
            subscribes = await usersService.GetUserSubscribes(username, PageSize + 1, null, null, myUserId);
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
        [FromQuery(Name = "next_page_token")] string? nextPageToken)
    {
        GetUserGroupSubscribesDto[] groupSubscribes;
        if (nextPageToken != null)
        {
            var decodeResult = CursorEncoder.DecodeText(nextPageToken);
            if (decodeResult.lastCreatedAt == null || decodeResult.lastValue == null)
                return BadRequest("Invalid next page token");

            groupSubscribes = await usersService.GetUserGroupSubscribes(username, PageSize + 1, decodeResult.lastCreatedAt, decodeResult.lastValue);
        }
        else
        {
            groupSubscribes = await usersService.GetUserGroupSubscribes(username, PageSize + 1, null, null);
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
        [FromUserId] Guid? myUserId)
    {
        GetUserSubscribersDto[] subscribers;
        if (nextPageToken != null)
        {
            var decodeResult = CursorEncoder.DecodeText(nextPageToken);
            if (decodeResult.lastCreatedAt == null || decodeResult.lastValue == null)
                return BadRequest("Invalid next page token");

            subscribers = await usersService.GetUserSubscribers(username, PageSize + 1, decodeResult.lastCreatedAt, decodeResult.lastValue, myUserId);
        }
        else
        {
            subscribers = await usersService.GetUserSubscribers(username, PageSize + 1, null, null, myUserId);
        }

        var subscribersPage = subscribers.Take(PageSize).ToArray();
        var nextToken = subscribers.Length <= PageSize
            ? null
            : CursorEncoder.Encode(subscribersPage.Last().CreatedAt, subscribersPage.Last().Username);

        return Ok(new PagedUserSubscribersDto(subscribersPage, nextToken));
    }
}
