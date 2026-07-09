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
        // Получение стены пользователя
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
    // [HttpGet("{username}/follow")]
    // public async Task<IActionResult> IsFollowing(string username, [FromClaim(ClaimTypes.NameIdentifier)] string userId)
    // {
    //     var user = Guid.Parse(userId);
    //     var isUserFollows = await usersService.IsUserFollows(user, username);
    //     return Ok(new { Result = isUserFollows });
    // }

    [IsAuthenticated]
    [HttpPost("{username}/follow")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> FollowUser([FromRoute] string username,
        [FromUserId] Guid? userId)
    {
        if (userId == null)
        {
            return Unauthorized();
        }
        var result = await usersService.FollowUser((Guid)userId, username);
        if (result)
        {
            return Created();
        }

        return BadRequest();
    }

    [IsAuthenticated]
    [HttpDelete("{username}/follow")]
    [ProducesResponseType(typeof(OperationResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UnfollowUser([FromRoute] string username,
        [FromUserId] Guid? userId)
    {
        if (userId == null)
        {
            return Unauthorized();
        }
        var result = await usersService.UnfollowUser((Guid)userId, username);
        if (result)
        {
            return Created();
        }

        return BadRequest();
    }

    [HttpGet("{username}/follows/users")]
    [ProducesResponseType(typeof(PagedUserFollowsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetUserFollows(
        [FromRoute] string username,
        [FromQuery(Name = "next_page_token")] string? nextPageToken,
        [FromUserId] Guid? myUserId)
    {
        GetUserFollowsDto[] follows;
        if (nextPageToken != null)
        {
            var decodeResult = CursorEncoder.DecodeText(nextPageToken);
            if (decodeResult.lastCreatedAt == null || decodeResult.lastValue == null)
                return BadRequest("Invalid next page token");

            follows = await usersService.GetUserFollows(username, PageSize + 1, decodeResult.lastCreatedAt, decodeResult.lastValue, myUserId);
        }
        else
        {
            follows = await usersService.GetUserFollows(username, PageSize + 1, null, null, myUserId);
        }

        var followsPage = follows.Take(PageSize).ToArray();
        var nextToken = follows.Length <= PageSize
            ? null
            : CursorEncoder.Encode(followsPage.Last().CreatedAt, followsPage.Last().Username);

        return Ok(new PagedUserFollowsDto(followsPage, nextToken));
    }

    [HttpGet("{username}/follows/groups")]
    [ProducesResponseType(typeof(PagedUserGroupFollowsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetGroupFollows(
        [FromRoute] string username,
        [FromQuery(Name = "next_page_token")] string? nextPageToken)
    {
        GetUserFollowingGroupsDto[] groupFollows;
        if (nextPageToken != null)
        {
            var decodeResult = CursorEncoder.DecodeText(nextPageToken);
            if (decodeResult.lastCreatedAt == null || decodeResult.lastValue == null)
                return BadRequest("Invalid next page token");

            groupFollows = await usersService.GetUserFollowingGroups(username, PageSize + 1, decodeResult.lastCreatedAt, decodeResult.lastValue);
        }
        else
        {
            groupFollows = await usersService.GetUserFollowingGroups(username, PageSize + 1, null, null);
        }

        var groupFollowsPage = groupFollows.Take(PageSize).ToArray();
        var nextToken = groupFollows.Length <= PageSize
            ? null
            : CursorEncoder.Encode(groupFollowsPage.Last().CreatedAt, groupFollowsPage.Last().Alias);

        return Ok(new PagedUserGroupFollowsDto(groupFollowsPage, nextToken));
    }

    [HttpGet("{username}/followers")]
    [ProducesResponseType(typeof(PagedUserFollowersDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetUserFollowers(
        [FromRoute] string username,
        [FromQuery(Name = "next_page_token")] string? nextPageToken,
        [FromUserId] Guid? myUserId)
    {
        GetUserFollowersDto[] followers;
        if (nextPageToken != null)
        {
            var decodeResult = CursorEncoder.DecodeText(nextPageToken);
            if (decodeResult.lastCreatedAt == null || decodeResult.lastValue == null)
                return BadRequest("Invalid next page token");

            followers = await usersService.GetUserFollowers(username, PageSize + 1, decodeResult.lastCreatedAt, decodeResult.lastValue, myUserId);
        }
        else
        {
            followers = await usersService.GetUserFollowers(username, PageSize + 1, null, null, myUserId);
        }

        var followersPage = followers.Take(PageSize).ToArray();
        var nextToken = followers.Length <= PageSize
            ? null
            : CursorEncoder.Encode(followersPage.Last().CreatedAt, followersPage.Last().Username);

        return Ok(new PagedUserFollowersDto(followersPage, nextToken));
    }
}
