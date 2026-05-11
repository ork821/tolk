using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace TolkApi.Utility;

public static class ClaimBindingSource
{
    public static readonly BindingSource Claim = new(
        "Claim", // ID of our BindingSource, must be unique
        "BindingSource_Claim", // Display name
        false, // Marks whether the source is greedy or not
        true); // Marks if the source is from HTTP Request
}