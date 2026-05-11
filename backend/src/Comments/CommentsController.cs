using Asp.Versioning;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using MindzBackDotNet.DTO;
using MindzBackDotNet.Posts;
using MindzBackDotNet.Reactions;
using MindzBackDotNet.Utility;

namespace MindzBackDotNet.Comments;

[ApiController]
[ApiVersion(1.0)]
[Route("v{version:apiVersion}/[controller]")]
public class CommentsController(CommentsService commentsService, SnowflakeIdGenerator idGenerator, ReactionService reactionService)
    : ControllerBase
{

    [HttpGet("{comment:long}/replies")]
    public async Task<IActionResult> GetReplies(
            [FromRoute] long comment, 
            [FromQuery(Name = "next_page_token")] string? nextPageToken
        )
    {
        CommentEntity[] comments = [];
        if (nextPageToken == null)
        {
            comments = await commentsService.GetCommentReplies(comment, 10, null, null);
        }
        else
        {
            var parseResult = CursorEncoder.Decode(nextPageToken);
            if (parseResult.lastCreatedAt == null || parseResult.lastId == null)
            {
                return BadRequest("Invalid next page token");
            }
            comments = await commentsService.GetCommentReplies(comment, 10, parseResult.lastCreatedAt, parseResult.lastId);
        }
        
        return  Ok(new
        {
            Comments = comments,
            NextPageToken = CursorEncoder.Encode(comments.Last().CreatedAt, comments.Last().Id)
        });
    }
    
    [Authorize]
    [HttpPatch("{comment}")]
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
    public async Task<IActionResult> GetReactions([FromRoute] long comment)
    {
        var reactions = await reactionService.GetCommentReactions(comment);
        
        return Ok(reactions);
    }
    
    [Authorize]
    [HttpPost("{comment:long}/reactions")]
    public async Task<IActionResult> AddCommentReaction(
        [FromRoute] long comment,
        [FromQuery] string reaction,
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
    [HttpDelete("{comment:long}/reactions")]
    public async Task<IActionResult> DeleteCommentReaction(
        [FromRoute] long comment,
        [FromQuery] string reaction,
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