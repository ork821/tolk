namespace MindzBackDotNet.Users.DTO;

public record GetUserByUsernameDto(
    Guid Id,
    string Username,
    string DisplayName,
    string? Email,
    string? Description,
    long Karma,
    long FollowersCount,
    long FollowUserCount,
    long FollowGroupsCount
);