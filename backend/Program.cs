using System.Net;
using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using MindzBackDotNet.Auth;
using MindzBackDotNet.Database;
using MindzBackDotNet.Posts;
using MindzBackDotNet.Users;
using MindzBackDotNet.Utility;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables("MINDZ_");
builder.Services.AddCors(options =>
{
    options.AddPolicy("CORS",
        policy =>
        {
            var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? 
                                 new[] { builder.Configuration["Host"] ?? "http://localhost:3000" };
            
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.KnownProxies.Add(IPAddress.Parse("10.10.1.197"));
});

if (builder.Configuration["JwtSettings:AccessSecret"] == null)
{
    throw new Exception("Access key is missing");
}

// Add services to the container.
builder.Services.AddSingleton<DatabaseContext>(_ =>
{
    var connStr = builder.Configuration.GetConnectionString("DataBase");
    if (connStr == null)
    {
        throw new ApplicationException("Db connection string not found");
    }

    return new DatabaseContext(connStr);
});
builder.Services.AddSingleton<SnowflakeIdGenerator>(_ => new SnowflakeIdGenerator(7, 7));
builder.Services.AddSingleton<PostsService>();
// builder.Services.AddSingleton<LinkPreviewService>();
builder.Services.AddSingleton<UsersService>();
builder.Services.AddSingleton<AuthService>();
// builder.Services.AddSingleton<SubscribeService>();
// builder.Services.AddSingleton<CommentService>();
builder.Services.AddSingleton<TokenService>();

// Register the IConnectionMultiplexer explicitly so it can be accessed via DI
// (e.g. for the IP rate limiting store)
// builder.Services.AddSingleton<IConnectionMultiplexer>(
//     _ => ConnectionMultiplexer.Connect(builder.Configuration.GetConnectionString("Redis")!));

// Explicitly register IDistributedCache to re-use existing IConnectionMultiplexer
// to reduce the number of redundant connections to the Redis instance
builder.Services.AddSingleton<IDistributedCache>(s =>
{
    return new RedisCache(new RedisCacheOptions
    {
        // Use "ProjectName:" as an instance name to namespace keys and avoid conflicts between projects
        InstanceName = "Mindz",
        ConnectionMultiplexerFactory = () =>
            Task.FromResult(s.GetRequiredService<IConnectionMultiplexer>())
    });
});
// Create ticket store to store data inside redis
// builder.Services.AddSingleton<ITicketStore, RedisTicketStore>();

var authOptions = new AuthOptions(builder.Configuration);
builder.Services.AddSingleton(authOptions);

builder.Services.AddControllers(options => { options.ValueProviderFactories.Add(new ClaimValueProviderFactory()); })
    .AddNewtonsoftJson();

builder.Services.AddAuthentication((options) =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            // указывает, будет ли валидироваться издатель при валидации токена
            ValidateIssuer = true,
            // строка, представляющая издателя
            ValidIssuer = AuthOptions.ISSUER,
            // будет ли валидироваться потребитель токена
            ValidateAudience = true,
            // установка потребителя токена
            ValidAudience = AuthOptions.AUDIENCE,
            // будет ли валидироваться время существования
            ValidateLifetime = true,
            // установка ключа безопасности
            IssuerSigningKey = authOptions.GetSymmetricAccessSecurityKey(),
            // валидация ключа безопасности
            ValidateIssuerSigningKey = true
        };
    });

builder.Services.AddOptions<CookieAuthenticationOptions>()
    .Configure<ITicketStore>((options, store) => { options.SessionStore = store; });

builder.Services.AddAuthorization();

builder.Services.AddApiVersioning(options => { options.ReportApiVersions = true; })
    .AddMvc();


var app = builder.Build();

app.Use((context, next) =>
{
    var host = context.Request.Headers["X-Forwarded-Host"];
    var schema = context.Request.Headers["X-Forwarded-Proto"];
    if (host.Count > 0 && schema.Count > 0 && host[0] != null && schema[0] != null)
    {
        context.Request.Scheme = schema[0]!;
        context.Request.Host = new HostString(host[0]!);
    }

    return next();
});

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

var defaultFolderCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite |
                              UnixFileMode.GroupRead |
                              UnixFileMode.GroupWrite |
                              UnixFileMode.OtherRead |
                              UnixFileMode.OtherWrite; 
var avatarsFolder = Path.Combine(Directory.GetCurrentDirectory(), "avatars");
if (!Directory.Exists(avatarsFolder))
{
    if (OperatingSystem.IsLinux())
        Directory.CreateDirectory(avatarsFolder, defaultFolderCreateMode);
    else
    {
        Directory.CreateDirectory(avatarsFolder);
    }
}
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(avatarsFolder),
    RequestPath = "/api/v1/users/avatar"
});

var attachmanetsFolder = Path.Combine(Directory.GetCurrentDirectory(), "attachments");
if (!Directory.Exists(attachmanetsFolder))
{
    if (OperatingSystem.IsLinux())
        Directory.CreateDirectory(attachmanetsFolder, defaultFolderCreateMode);
    else
    {
        Directory.CreateDirectory(attachmanetsFolder);
    }
}
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(attachmanetsFolder),
    RequestPath = "/api/v1/posts/image"
});

app.UseCors("CORS");
app.UseAuthentication();
app.UseAuthorization();

app.UseCookiePolicy(new CookiePolicyOptions
{
    MinimumSameSitePolicy = SameSiteMode.Lax
});

app.UsePathBase("/api");
app.MapControllers();


app.Run();