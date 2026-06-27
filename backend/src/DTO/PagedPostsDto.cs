using System.ComponentModel.DataAnnotations;

namespace TolkApi.DTO;

public record PagedPostsDto(
    [property: Required]
    PostDto[] Posts,
    string? NextPageToken
);
