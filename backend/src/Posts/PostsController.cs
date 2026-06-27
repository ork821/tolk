using Asp.Versioning;
using System.ComponentModel.DataAnnotations;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TolkApi.Comments;
using TolkApi.DTO;
using TolkApi.Posts.DTO;
using TolkApi.Reactions;
using TolkApi.Reactions.DTO;
using TolkApi.Utility;

namespace TolkApi.Posts;

[ApiController]
[ApiVersion(1.0)]
[Route("v{version:apiVersion}/[controller]")]
public class PostsController(SnowflakeIdGenerator idGenerator, PostsService service, CommentsService commentsService,
    ReactionService reactionService)
    : ControllerBase
{
    private const int PageSize = 20;

    [IsAuthenticated]
    [HttpPost]
    [ProducesResponseType(typeof(CreateUpdatePostDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreatePost([FromBody] CreatePostBodyDto createDto, [FromUserId] Guid userId)
    {
        // Логика создания поста (в группе или на личной стене)
        var newPostId = idGenerator.CreateId();
        var createPostResult = await service.CreatePost(newPostId, userId, createDto.ParentPostId, createDto.Title,
            (int)createDto.Type, createDto.Content);
        if (createPostResult == null) return BadRequest("Failed to create post");
        return Created($"/api/v1/posts/{newPostId}", createPostResult);
    }

    [HttpGet("{post:long}")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPost([FromRoute] long post)
    {
        var postEntity = await service.GetPost(post);
        if (postEntity == null) return NotFound("Post not found");

        return Ok(postEntity);
    }

    [HttpGet("{post:long}/thread")]
    [ProducesResponseType(typeof(PostDto[]), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPostThread([FromRoute] long post)
    {
        var thread = await service.GetPostThread(post);
        if (thread.Length == 0) return NotFound("Post thread not found");

        return Ok(thread);
    }

    [IsAuthenticated]
    [HttpPut("{post:long}")]
    [ProducesResponseType(typeof(CreateUpdatePostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdatePost(
        [FromRoute] long post,
        [FromBody] UpdatePostBodyDto updateDto,
        [FromUserId] Guid userId)
    {
        var updatePostResult =
            await service.UpdatePost(post, userId, updateDto.Title, (int)updateDto.Type, updateDto.Content);
        if (updatePostResult == null) return BadRequest("Failed to update post");
        return Ok(updatePostResult);
    }

    [IsAuthenticated]
    [HttpDelete("{post:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeletePost([FromRoute] long post, [FromUserId] Guid userId)
    {
        var deletePostResult = await service.DeletePost(post, userId);
        if (deletePostResult == false) return BadRequest("Failed to delete post");

        return NoContent();
    }
    
    /**
     * Работы с комментариями
     */
    
    [HttpGet("{post:long}/comments")]
    [ProducesResponseType(typeof(PagedCommentsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetPostComments([FromRoute] long post, 
        [FromQuery(Name = "next_page_token")] string? nextPageToken)
    {
        CommentEntity[] comments;
        if (nextPageToken == null)
        {
            comments = await service.GetPostComments(post, PageSize + 1, null, null);
        }
        else
        {
            var parseResult = CursorEncoder.Decode(nextPageToken);
            if (parseResult.lastCreatedAt == null || parseResult.lastId == null)
            {
                return BadRequest("Invalid next page token");
            }

            comments = await service.GetPostComments(post, PageSize + 1, parseResult.lastCreatedAt, parseResult.lastId);
        }

        var page = comments.Take(PageSize).ToArray();
        var nextToken = comments.Length <= PageSize
            ? null
            : CursorEncoder.Encode(page.Last().CreatedAt, page.Last().Id);
        
        return  Ok(new PagedCommentsDto(page, nextToken));
    }
    
    
    [Authorize]
    [HttpPost("{post:long}/comments")]
    [ProducesResponseType(typeof(CreateUpdateCommentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateComment(
        [FromRoute] long post,
        [FromBody] CreateCommentBodyDto body,
        [FromUserId] Guid userId
    )
    {
        var validator = new CreateCommentDtoValidator();
        var validationResult = await validator.ValidateAsync(body);
        if (!validationResult.IsValid)
        {
            return BadRequest();
        }
        var id = idGenerator.CreateId();
        var createResult = await commentsService.CreateComment(
            post,
            id,
            userId,
            body.Type,
            body.Content);
        if (createResult == null)
        {
            return BadRequest();
        }

        return Ok(createResult);
    }
    
    [HttpGet("{post:long}/reactions")]
    [ProducesResponseType(typeof(GetReactionsDto[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReactions([FromRoute] long post)
    {
        var reactions = await reactionService.GetPostReactions(post);
        
        return Ok(reactions);
    }
    
    [Authorize]
    [HttpPut("{post:long}/reactions/{reaction}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddPostReaction(
        [FromRoute] long post,
        [FromRoute] string reaction,
        [FromUserId] Guid userId
    )
    {
        var result = await reactionService.AddPostReaction(
            post,
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
    [HttpDelete("{post:long}/reactions/{reaction}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeletePostReaction(
        [FromRoute] long post,
        [FromRoute] string reaction,
        [FromUserId] Guid userId
    )
    {
        var result = await reactionService.DeletePostReaction(
            post,
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

public enum ContentType
{
    Text
}

public record CreatePostBodyDto(
    long? ParentPostId,
    [property: Required]
    string Title,
    [property: Required]
    ContentType Type,
    [property: Required]
    string Content
);

public class CreatePostDtoValidator : AbstractValidator<CreatePostBodyDto>
{
    public CreatePostDtoValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Empty title is not allowed")
            .MinimumLength(10).WithMessage("Minimum length is 10 characters")
            .MaximumLength(255).WithMessage("Maximum length is 255 characters");

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

public record UpdatePostBodyDto(
    [property: Required]
    string Title,
    [property: Required]
    ContentType Type,
    [property: Required]
    string Content
);

public class UpdatePostDtoValidator : AbstractValidator<UpdatePostBodyDto>
{
    public UpdatePostDtoValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Empty title is not allowed")
            .MinimumLength(10).WithMessage("Minimum length is 10 characters")
            .MaximumLength(255).WithMessage("Maximum length is 255 characters");


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

public record CreateCommentBodyDto(
    long? ParentCommentId,
    [property: Required]
    ContentType Type,
    [property: Required]
    string Content
);

public class CreateCommentDtoValidator : AbstractValidator<CreateCommentBodyDto>
{
    public CreateCommentDtoValidator()
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
