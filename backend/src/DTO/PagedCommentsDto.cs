namespace TolkApi.DTO;

public record PagedCommentsDto(
    CommentEntity[] Comments,
    string? NextPageToken
);
