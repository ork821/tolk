using System.ComponentModel.DataAnnotations;

namespace TolkApi.DTO;

public record PagedCommentsDto(
    [property: Required]
    CommentEntity[] Comments,
    string? NextPageToken
);
