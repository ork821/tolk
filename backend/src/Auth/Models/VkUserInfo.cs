namespace MindzBackDotNet.Auth.Models;

public record VkUserInfo
{
    public int Id { get; set; }

    public string Username { get; set; }

    public string DisplayName { get; set; }

    public string ProfileUrl { get; set; }
}