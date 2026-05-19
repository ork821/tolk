using Asp.Versioning;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TolkApi.DTO;
using TolkApi.Posts;
using TolkApi.Reactions;
using TolkApi.Reactions.DTO;
using TolkApi.Utility;

namespace TolkApi.Comments;

[ApiController]
[ApiVersion(1.0)]
[Route("v{version:apiVersion}/[controller]")]
public class CommentsController(CommentsService commentsService, SnowflakeIdGenerator idGenerator, ReactionService reactionService)
    : ControllerBase
{
    private const int RepliesPageSize = 10;

    [HttpGet("{comment:long}/replies")]
    [ProducesResponseType(typeof(PagedCommentsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetReplies(
            [FromRoute] long comment, 
            [FromQuery(Name = "next_page_token")] string? nextPageToken
        )
    {
        CommentEntity[] comments = [];
        if (nextPageToken == null)
        {
            comments = await commentsService.GetCommentReplies(comment, RepliesPageSize + 1, null, null);
        }
        else
        {
            var parseResult = CursorEncoder.Decode(nextPageToken);
            if (parseResult.lastCreatedAt == null || parseResult.lastId == null)
            {
                return BadRequest("Invalid next page token");
            }
            comments = await commentsService.GetCommentReplies(comment, RepliesPageSize + 1, parseResult.lastCreatedAt, parseResult.lastId);
        }
        
        var page = comments.Take(RepliesPageSize).ToArray();
        var nextToken = comments.Length <= RepliesPageSize
            ? null
            : CursorEncoder.Encode(page.Last().CreatedAt, page.Last().Id);

        return  Ok(new PagedCommentsDto(page, nextToken));
    }

    [Authorize]
    [HttpPost("{comment:long}/replies")]
    [ProducesResponseType(typeof(CreateUpdateCommentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateReply(
        [FromRoute] long comment,
        [FromBody] CreateReplyCommentBodyDto body,
        [FromUserId] Guid userId
    )
    {
        var validator = new CreateReplyCommentDtoValidator();
        var validateResult = await validator.ValidateAsync(body);
        if (!validateResult.IsValid)
        {
            return BadRequest();
        }

        var id = idGenerator.CreateId();
        var createResult = await commentsService.CreateReplyComment(
            id,
            comment,
            userId,
            body.Type,
            body.Content);

        if (createResult == null)
        {
            return BadRequest();
        }

        return StatusCode(StatusCodes.Status201Created, createResult);
    }
    
    [Authorize]
    [HttpPatch("{comment}")]
    [ProducesResponseType(typeof(CreateUpdateCommentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateComment(
        [FromRoute] long comment,
        [FromBody] UpdateCommentBodyDto body,
        [FromUserId] Guid userId
    )
    {
        var validator = new UpdateCommentDtoValidator();
        var validateResult = await validator.ValidateAsync(body);
        if (!validateResult.IsValid)
        {
            return BadRequest();
        }
        
        var updateResult = await commentsService.UpdateComment(
            comment,
            userId,
            body.Type,
            body.Content);
        
        if (updateResult == null)
        {
            return BadRequest();
        }

        return Ok(updateResult);
    }
    
    [Authorize]
    [HttpDelete("{comment}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteComment(
        [FromRoute] long comment,
        [FromUserId] Guid userId
    )
    {
        var updateResult = await commentsService.DeleteComment(
            comment,
            userId
            );
        
        if (updateResult == false)
        {
            return BadRequest();
        }

        return NoContent();
    }

    [HttpGet("{comment:long}/reactions")]
    [ProducesResponseType(typeof(GetReactionsDto[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReactions([FromRoute] long comment)
    {
        var reactions = await reactionService.GetCommentReactions(comment);
        
        return Ok(reactions);
    }
    
    [Authorize]
    [HttpPut("{comment:long}/reactions/{reaction}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddCommentReaction(
        [FromRoute] long comment,
        [FromRoute] string reaction,
        [FromUserId] Guid userId
    )
    {
        var result = await reactionService.AddCommentReaction(
            comment,
            userId,
            reaction
        );
        
        if (result == false)
        {
            return BadRequest();
        }

        return NoContent();
    }
    
    [Authorize]
    [HttpDelete("{comment:long}/reactions/{reaction}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteCommentReaction(
        [FromRoute] long comment,
        [FromRoute] string reaction,
        [FromUserId] Guid userId
    )
    {
        var result = await reactionService.DeleteCommentReaction(
            comment,
            userId,
            reaction
        );
        
        if (result == false)
        {
            return BadRequest();
        }

        return NoContent();
    }
}



public record UpdateCommentBodyDto(
    ContentType Type,
    string Content
);

public record CreateReplyCommentBodyDto(
    ContentType Type,
    string Content
);

public class UpdateCommentDtoValidator : AbstractValidator<UpdateCommentBodyDto>
{
    public UpdateCommentDtoValidator()
    {
        RuleFor(x => x.Type)
            .NotEmpty()
            .IsInEnum()
            .WithMessage("Type not valid");

        RuleFor(x => x.Content)
            .NotEmpty()
            .Length(10, 500)
            .WithMessage("Content length must be between 10 and 500 characters");
    }
}

public class CreateReplyCommentDtoValidator : AbstractValidator<CreateReplyCommentBodyDto>
{
    public CreateReplyCommentDtoValidator()
    {
        RuleFor(x => x.Type)
            .NotEmpty()
            .IsInEnum()
            .WithMessage("Type not valid");

        RuleFor(x => x.Content)
            .NotEmpty()
            .Length(10, 500)
            .WithMessage("Content length must be between 10 and 500 characters");
    }
}
