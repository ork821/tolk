using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using MindzBackDotNet.DTO;
using MindzBackDotNet.Utility;

namespace MindzBackDotNet.Users;

[ApiController]
[ApiVersion(1.0)]
[Route("v{version:apiVersion}/[controller]")]
public class UsersController(UsersService usersService) : ControllerBase
{
    [HttpGet("{username}/posts")]
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
            posts = await usersService.GetUserPosts(username, 20, decodeResult.lastCreatedAt, decodeResult.lastId);
        }
        else
        {
            posts = await usersService.GetUserPosts(username, 20, null, null);
        }

        if (posts.Length == 0) return NotFound();

        var lastPost = posts.Last();
        var nextToken = CursorEncoder.Encode(lastPost.CreatedAt, lastPost.Id);
        // Получение стены пользователя
        return Ok(new { Posts = posts, NextPageToken = nextToken });
    }

    [HttpGet("{username}")]
    public async Task<IActionResult> GetUserProfileInfo(string username)
    {
        var userInfo = await usersService.GetUserByUsername(username);
        if (userInfo == null) return NotFound();
        return Ok(userInfo);
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
    public async Task<IActionResult> FollowUser([FromRoute] string username,
        [FromClaim(ClaimTypes.NameIdentifier)] string userId)
    {
        var user = Guid.Parse(userId);
        var result = await usersService.FollowUser(user, username);
        return Ok(new { Result = result });
    }

    [IsAuthenticated]
    [HttpDelete("{username}/follow")]
    public async Task<IActionResult> UnfollowUser([FromRoute] string username,
        [FromClaim(ClaimTypes.NameIdentifier)] string userId)
    {
        var user = Guid.Parse(userId);
        var result = await usersService.UnfollowUser(user, username);
        return Ok(new { Result = result });
    }

    [HttpGet("{username}/follows/users")]
    public async Task<IActionResult> GetUserFollows(string username)
    {
        var follows = await usersService.GetUserFollows(username);
        return Ok(follows);
    }

    [HttpGet("{username}/follows/groups")]
    public async Task<IActionResult> GetGroupFollows(string username)
    {
        var groupFollows = await usersService.GetUserFollowingGroups(username);
        return Ok(groupFollows);
    }

    [HttpGet("{username}/followers")]
    public async Task<IActionResult> GetUserFollowers(string username)
    {
        var followers = await usersService.GetUserFollowers(username);
        return Ok(followers);
    }
}