using Asp.Versioning;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using MindzBackDotNet.DTO;

namespace MindzBackDotNet.Posts;

[ApiController]
[ApiVersion(1.0)]
[Route("v{version:apiVersion}/[controller]")]
public class GroupsController : ControllerBase
{
    [HttpPost]
    public IActionResult CreateGroup([FromBody] CreateGroupDto createDto)
    {
        var newGroupId = Guid.NewGuid();
        return Created($"/api/v1/groups/{newGroupId}", new { Id = newGroupId, Name = createDto.DisplayName });
    }


    [HttpGet("{group}")]
    public IActionResult GetGroupInfo([FromRoute] string group)
    {
        // Получение ленты постов группы с учетом курсора
        return Ok(new { Items = new object[] { }, NextCursor = "encoded_cursor_string" });
    }

    [HttpPost("{group}/post")]
    public IActionResult AddPostGroup([FromRoute] string group)
    {
        // Логика вступления в группу
        return NoContent();
    }

    [HttpDelete("{group}/post")]
    public IActionResult DeletePostGroup([FromRoute] string group)
    {
        // Логика вступления в группу
        return NoContent();
    }

    [HttpGet("{group}/posts")]
    public IActionResult GetGroupPosts(
        [FromRoute] string group,
        [FromQuery] PaginationDto pagination) // ASP.NET сам соберет объект из Query
    {
        // Получение ленты постов группы с учетом курсора
        return Ok(new { Items = new object[] { }, NextCursor = "encoded_cursor_string" });
    }

    [HttpGet("{group}/follow")]
    public IActionResult IsFollowingGroup([FromRoute] string group)
    {
        // Логика вступления в группу
        return NoContent();
    }

    [HttpPost("{group}/follow")]
    public IActionResult FollowGroup([FromRoute] string group)
    {
        // Логика вступления в группу
        return NoContent();
    }

    [HttpDelete("{group}/follow")]
    public IActionResult UnfollowGroup([FromRoute] string group)
    {
        // Логика выхода из группы
        return NoContent();
    }

    [HttpGet("{group}/followers")]
    public IActionResult GetGroupFollowers(string group)
    {
        return Ok(new { IsFollowing = true });
    }
}

public record CreateGroupDto(
    string DisplayName,
    string Alias,
    string? Description
);

public class CreateGroupDtoValidator : AbstractValidator<CreateGroupDto>
{
    public CreateGroupDtoValidator()
    {
        RuleFor(x => x.DisplayName)
            .NotEmpty()
            .Length(10, 255)
            .Matches(@"^[\p{IsCyrillic}\w\s]+$")
            .WithMessage("The display name must be between 10 and 255 characters long.");

        RuleFor(x => x.Alias)
            .NotEmpty()
            .Length(10, 255)
            .Matches(@"^[\w]+$")
            .WithMessage("The alias name must be between 10 and 255 characters long. Latin and digits");

        RuleFor(x => x.Description)
            .Length(10, 500)
            .Matches(@"^[\p{IsCyrillic}\w\s]+$")
            .WithMessage("The description must be between 10 and 500 characters long.");
    }
}