namespace TolkApi.Posts.DTO;

public record CreateUpdatePostDto(
    long Id,
    long? ParentPostId,
    string Title,
    int ContentType,
    string Content
);