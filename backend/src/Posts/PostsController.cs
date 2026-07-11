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
        var createPostResult = await service.CreatePost(newPostId, 
            userId, 
            null, 
            createDto.Title,
            (int)createDto.Type, 
            createDto.Content);
        
        if (createPostResult == null) return BadRequest("Failed to create post");
        return Created($"/api/v1/posts/{newPostId}", createPostResult);
    }

    [HttpGet("{post}")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPost([FromRoute] string post)
    {
        if (!SnowflakeIdParser.TryParse(post, out var postId)) return BadRequest("Invalid post id");

        var postEntity = await service.GetPost(postId);
        if (postEntity == null) return NotFound("Post not found");

        return Ok(postEntity);
    }
    
    [IsAuthenticated]
    [HttpPost("{post}")]
    [ProducesResponseType(typeof(CreateUpdatePostDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreatePostReply(
        [FromBody] CreatePostBodyDto createDto, 
        [FromUserId] Guid userId,
        [FromRoute] string post
    )
    {
        // Логика создания поста (в группе или на личной стене)
        if (!SnowflakeIdParser.TryParse(post, out var parentPostId)) return BadRequest("Invalid post id");

        var newPostId = idGenerator.CreateId();
        var createPostResult = await service.CreatePost(newPostId, 
            userId, 
            parentPostId, 
            createDto.Title,
            (int)createDto.Type, 
            createDto.Content);
        
        if (createPostResult == null) return BadRequest("Failed to create post");
        return Created($"/api/v1/posts/{newPostId}", createPostResult);
    }

    [HttpGet("{post}/thread")]
    [ProducesResponseType(typeof(PostDto[]), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPostThread([FromRoute] string post)
    {
        if (!SnowflakeIdParser.TryParse(post, out var postId)) return BadRequest("Invalid post id");

        var thread = await service.GetPostThread(postId);
        if (thread.Length == 0) return NotFound("Post thread not found");

        return Ok(thread);
    }

    [IsAuthenticated]
    [HttpPut("{post}")]
    [ProducesResponseType(typeof(CreateUpdatePostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdatePost(
        [FromRoute] string post,
        [FromBody] UpdatePostBodyDto updateDto,
        [FromUserId] Guid userId)
    {
        if (!SnowflakeIdParser.TryParse(post, out var postId)) return BadRequest("Invalid post id");

        var updatePostResult =
            await service.UpdatePost(postId, userId, updateDto.Title, (int)updateDto.Type, updateDto.Content);
        if (updatePostResult == null) return BadRequest("Failed to update post");
        return Ok(updatePostResult);
    }

    [IsAuthenticated]
    [HttpDelete("{post}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeletePost([FromRoute] string post, [FromUserId] Guid userId)
    {
        if (!SnowflakeIdParser.TryParse(post, out var postId)) return BadRequest("Invalid post id");

        var deletePostResult = await service.DeletePost(postId, userId);
        if (deletePostResult == false) return BadRequest("Failed to delete post");

        return NoContent();
    }
    
    /**
     * Работы с комментариями
     */
    
    [HttpGet("{post}/comments")]
    [ProducesResponseType(typeof(PagedCommentsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetPostComments([FromRoute] string post, 
        [FromQuery(Name = "next_page_token")] string? nextPageToken)
    {
        if (!SnowflakeIdParser.TryParse(post, out var postId)) return BadRequest("Invalid post id");

        CommentEntity[] comments;
        if (nextPageToken == null)
        {
            comments = await service.GetPostComments(postId, PageSize + 1, null, null);
        }
        else
        {
            var parseResult = CursorEncoder.Decode(nextPageToken);
            if (parseResult.lastCreatedAt == null || parseResult.lastId == null)
            {
                return BadRequest("Invalid next page token");
            }

            comments = await service.GetPostComments(postId, PageSize + 1, parseResult.lastCreatedAt, parseResult.lastId);
        }

        var page = comments.Take(PageSize).ToArray();
        var nextToken = comments.Length <= PageSize
            ? null
            : CursorEncoder.Encode(page.Last().CreatedAt, page.Last().Id);
        
        return  Ok(new PagedCommentsDto(page, nextToken));
    }
    
    
    [Authorize]
    [HttpPost("{post}/comments")]
    [ProducesResponseType(typeof(CreateUpdateCommentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateComment(
        [FromRoute] string post,
        [FromBody] CreateCommentBodyDto body,
        [FromUserId] Guid userId
    )
    {
        if (!SnowflakeIdParser.TryParse(post, out var postId)) return BadRequest("Invalid post id");

        var validator = new CreateCommentDtoValidator();
        var validationResult = await validator.ValidateAsync(body);
        if (!validationResult.IsValid)
        {
            return BadRequest(validationResult.ToString());
        }
        var id = idGenerator.CreateId();
        var createResult = await commentsService.CreateComment(
            postId,
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
    

    [HttpPost("metadata")]
    [ProducesResponseType(typeof(Dictionary<string, PostMetadataDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetMetadata(
        [FromBody] MetadataRequestDto body,
        [FromUserId] Guid? userId
    )
    {
        var validator = new MetadataRequestDtoValidator();
        var validationResult = await validator.ValidateAsync(body);
        if (!validationResult.IsValid) return BadRequest(validationResult.ToString());

        if (body.Ids.Length == 0) return Ok(new Dictionary<string, PostMetadataDto>());

        var postIds = new List<long>(body.Ids.Length);
        foreach (var post in body.Ids.Distinct())
        {
            if (!SnowflakeIdParser.TryParse(post, out var postId)) return BadRequest("Invalid post id");
            postIds.Add(postId);
        }

        var uniquePostIds = postIds.ToArray();
        var reactions = await reactionService.GetPostReactions(postIds.ToArray(), userId);
        var reactionsByPostId = reactions.ToDictionary(x => x.PostId);

        var emptyPermissions = new PostPermissionsDto(false, false);
        var permissionsByPostId = userId == null
            ? new Dictionary<long, PostPermissionsDto>()
            : await reactionService.GetPostPermissions(uniquePostIds, userId.Value);

        var metadata = uniquePostIds
            .ToDictionary(
                postId => postId.ToString(),
                postId => new PostMetadataDto(
                reactionsByPostId.TryGetValue(postId.ToString(), out var postReactions)
                    ? postReactions.Reactions
                    : [],
                permissionsByPostId.TryGetValue(postId, out var permissions)
                    ? permissions
                    : emptyPermissions));

        return Ok(metadata);
    }
    
    [HttpGet("{post}/reactions")]
    [ProducesResponseType(typeof(GetReactionsDto[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReactions([FromRoute] string post, [FromUserId] Guid? userId)
    {
        if (!SnowflakeIdParser.TryParse(post, out var postId)) return BadRequest("Invalid post id");

        var reactions = await reactionService.GetPostReactions(postId, userId);
        
        return Ok(reactions);
    }
    
    [Authorize]
    [HttpPut("{post}/reactions/{reaction}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddPostReaction(
        [FromRoute] string post,
        [FromRoute] string reaction,
        [FromUserId] Guid userId
    )
    {
        if (!SnowflakeIdParser.TryParse(post, out var postId)) return BadRequest("Invalid post id");

        var result = await reactionService.AddPostReaction(
            postId,
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
    [HttpDelete("{post}/reactions/{reaction}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeletePostReaction(
        [FromRoute] string post,
        [FromRoute] string reaction,
        [FromUserId] Guid userId
    )
    {
        if (!SnowflakeIdParser.TryParse(post, out var postId)) return BadRequest("Invalid post id");

        var result = await reactionService.DeletePostReaction(
            postId,
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

public class CreatePostBodyDto
{
    [Required]
    public required string Title { get; init; }

    [Required]
    public required ContentType Type { get; init; }

    [Required]
    public required string Content { get; init; }
}

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

public class UpdatePostBodyDto
{
    [Required]
    public required string Title { get; init; }

    [Required]
    public required ContentType Type { get; init; }

    [Required]
    public required string Content { get; init; }
}

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

public class CreateCommentBodyDto
{
    public string? ParentCommentId { get; init; }

    [Required]
    public required ContentType Type { get; init; }

    [Required]
    public required string Content { get; init; }
}

public class CreateCommentDtoValidator : AbstractValidator<CreateCommentBodyDto>
{
    public CreateCommentDtoValidator()
    {
        RuleFor(x => x.Type)
            .IsInEnum()
            .WithMessage("Type not valid");

        RuleFor(x => x.Content)
            .NotEmpty()
            .Length(10, 500)
            .WithMessage("Content length must be between 10 and 500 characters");
    }
}
