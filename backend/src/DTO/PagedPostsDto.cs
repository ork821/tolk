using System.ComponentModel.DataAnnotations;

namespace TolkApi.DTO;

public record PagedPostsDto(
    [Required]
    PostDto[] Posts,
    string? NextPageToken
);
