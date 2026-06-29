using System.ComponentModel.DataAnnotations;

namespace TolkApi.DTO;

public record PagedCommentsDto(
    [Required]
    CommentEntity[] Comments,
    string? NextPageToken
);
