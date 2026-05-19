namespace TolkApi.DTO;

public record PagedPostsDto(
    PostDto[] Posts,
    string? NextPageToken
);
