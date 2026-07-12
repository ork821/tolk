using Asp.Versioning;
using System.ComponentModel.DataAnnotations;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using TolkApi.Comments.DTO;
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

    [HttpPost("metadata")]
    [ProducesResponseType(typeof(Dictionary<string, CommentMetadataDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetMetadata(
        [FromBody] MetadataRequestDto body,
        [FromUserId] Guid? userId
    )
    {
        var validator = new MetadataRequestDtoValidator();
        var validationResult = await validator.ValidateAsync(body);
        if (!validationResult.IsValid) return BadRequest(validationResult.ToString());

        if (body.Ids.Length == 0) return Ok(new Dictionary<string, CommentMetadataDto>());

        var commentIds = new List<long>(body.Ids.Length);
        foreach (var comment in body.Ids.Distinct())
        {
            if (!SnowflakeIdParser.TryParse(comment, out var commentId)) return BadRequest("Invalid comment id");
            commentIds.Add(commentId);
        }

        var uniqueCommentIds = commentIds.ToArray();
        var reactions = await reactionService.GetCommentReactions(uniqueCommentIds, userId);
        var reactionsByCommentId = reactions.ToDictionary(x => x.CommentId);
        var emptyPermissions = new CommentPermissionsDto(false, false, false);
        var permissionsByCommentId = userId == null
            ? new Dictionary<long, CommentPermissionsDto>()
            : await reactionService.GetCommentPermissions(uniqueCommentIds, userId.Value);

        var metadata = uniqueCommentIds
            .ToDictionary(
                commentId => commentId.ToString(),
                commentId => new CommentMetadataDto(
                reactionsByCommentId.TryGetValue(commentId.ToString(), out var commentReactions)
                    ? commentReactions.Reactions
                    : [],
                permissionsByCommentId.GetValueOrDefault(commentId, emptyPermissions)));

        return Ok(metadata);
    }

    [HttpGet("{comment}/replies")]
    [ProducesResponseType(typeof(PagedCommentsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetReplies(
            [FromRoute] string comment, 
            [FromQuery(Name = "next_page_token")] string? nextPageToken
        )
    {
        if (!SnowflakeIdParser.TryParse(comment, out var commentId)) return BadRequest("Invalid comment id");

        CommentEntity[] comments = [];
        if (nextPageToken == null)
        {
            comments = await commentsService.GetCommentReplies(commentId, RepliesPageSize + 1, null, null);
        }
        else
        {
            var parseResult = CursorEncoder.Decode(nextPageToken);
            if (parseResult.lastCreatedAt == null || parseResult.lastId == null)
            {
                return BadRequest("Invalid next page token");
            }
            comments = await commentsService.GetCommentReplies(commentId, RepliesPageSize + 1, parseResult.lastCreatedAt, parseResult.lastId);
        }
        
        var page = comments.Take(RepliesPageSize).ToArray();
        var nextToken = comments.Length <= RepliesPageSize
            ? null
            : CursorEncoder.Encode(page.Last().CreatedAt, page.Last().Id);

        return  Ok(new PagedCommentsDto(page, nextToken));
    }

    [Authorize]
    [HttpPost("{comment}/replies")]
    [ProducesResponseType(typeof(CreateUpdateCommentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateReply(
        [FromRoute] string comment,
        [FromBody] CreateReplyCommentBodyDto body,
        [FromUserId] Guid userId
    )
    {
        if (!SnowflakeIdParser.TryParse(comment, out var commentId)) return BadRequest("Invalid comment id");

        var validator = new CreateReplyCommentDtoValidator();
        var validateResult = await validator.ValidateAsync(body);
        if (!validateResult.IsValid)
        {
            return BadRequest(validateResult.ToString());
        }

        var id = idGenerator.CreateId();
        CreateUpdateCommentDto? createResult;
        try
        {
            createResult = await commentsService.CreateReplyComment(
                id,
                commentId,
                userId,
                (int)body.Type,
                body.Content);
        }
        catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            return BadRequest("Maximum comment nesting depth exceeded");
        }

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
        [FromRoute] string comment,
        [FromBody] UpdateCommentBodyDto body,
        [FromUserId] Guid userId
    )
    {
        if (!SnowflakeIdParser.TryParse(comment, out var commentId)) return BadRequest("Invalid comment id");

        var validator = new UpdateCommentDtoValidator();
        var validateResult = await validator.ValidateAsync(body);
        if (!validateResult.IsValid)
        {
            return BadRequest();
        }
        
        var updateResult = await commentsService.UpdateComment(
            commentId,
            userId,
            (int)body.Type,
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
        [FromRoute] string comment,
        [FromUserId] Guid userId
    )
    {
        if (!SnowflakeIdParser.TryParse(comment, out var commentId)) return BadRequest("Invalid comment id");

        var updateResult = await commentsService.DeleteComment(
            commentId,
            userId
            );
        
        if (updateResult == false)
        {
            return BadRequest();
        }

        return NoContent();
    }

    [HttpGet("{comment}/reactions")]
    [ProducesResponseType(typeof(GetReactionsDto[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReactions([FromRoute] string comment)
    {
        if (!SnowflakeIdParser.TryParse(comment, out var commentId)) return BadRequest("Invalid comment id");

        var reactions = await reactionService.GetCommentReactions(commentId);
        
        return Ok(reactions);
    }
    
    [Authorize]
    [HttpPut("{comment}/reactions/{reaction}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddCommentReaction(
        [FromRoute] string comment,
        [FromRoute] string reaction,
        [FromUserId] Guid userId
    )
    {
        if (!SnowflakeIdParser.TryParse(comment, out var commentId)) return BadRequest("Invalid comment id");

        var result = await reactionService.AddCommentReaction(
            commentId,
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
    [HttpDelete("{comment}/reactions/{reaction}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteCommentReaction(
        [FromRoute] string comment,
        [FromRoute] string reaction,
        [FromUserId] Guid userId
    )
    {
        if (!SnowflakeIdParser.TryParse(comment, out var commentId)) return BadRequest("Invalid comment id");

        var result = await reactionService.DeleteCommentReaction(
            commentId,
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



public class UpdateCommentBodyDto
{
    [Required]
    public required ContentType Type { get; init; }

    [Required]
    public required string Content { get; init; }
}

public class CreateReplyCommentBodyDto
{
    [Required]
    public required ContentType Type { get; init; }

    [Required]
    public required string Content { get; init; }
}

public class UpdateCommentDtoValidator : AbstractValidator<UpdateCommentBodyDto>
{
    public UpdateCommentDtoValidator()
    {
        RuleFor(x => x.Type)
            .IsInEnum()
            .WithMessage("Type not valid");

        RuleFor(x => x.Content)
            .Length(10, 500)
            .WithMessage("Content length must be between 10 and 500 characters");
    }
}

public class CreateReplyCommentDtoValidator : AbstractValidator<CreateReplyCommentBodyDto>
{
    public CreateReplyCommentDtoValidator()
    {
        RuleFor(x => x.Type)
            .IsInEnum()
            .WithMessage("Type not valid");

        RuleFor(x => x.Content)
            .Length(10, 500)
            .WithMessage("Content length must be between 10 and 500 characters");
    }
}
