using System.Net;
using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using TolkApi.Auth;
using TolkApi.Auth.Providers;
using TolkApi.Comments;
using TolkApi.Database;
using TolkApi.Posts;
using TolkApi.Reactions;
using TolkApi.Users;
using TolkApi.Utility;
using TolkApi.Utility.OpenApi;
using TolkApi.Utility.Routing;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables("TOLK_");
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
builder.Services.AddSingleton<CommentsService>();
builder.Services.AddSingleton<ReactionService>();
builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<ExternalUserInfoProviderFactory>();
builder.Services.AddHttpClient<YandexExternalUserInfoProvider>(client =>
{
    client.BaseAddress = new Uri("https://login.yandex.ru/");
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddHttpClient<VkExternalUserInfoProvider>(client =>
{
    client.BaseAddress = new Uri("https://api.vk.com/");
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.Configure<PostReactionStatsSyncOptions>(
    builder.Configuration.GetSection(PostReactionStatsSyncOptions.SectionName));
builder.Services.AddHostedService<PostReactionStatsSyncWorker>();

// Register the IConnectionMultiplexer explicitly so it can be accessed via DI
// (e.g. for the IP rate limiting store)
// builder.Services.AddSingleton<IConnectionMultiplexer>(
//     _ => ConnectionMultiplexer.Connect(builder.Configuration.GetConnectionString("Redis")!));

// Explicitly register IDistributedCache to re-use existing IConnectionMultiplexer
// to reduce the number of redundant connections to the Redis instance
// builder.Services.AddSingleton<IDistributedCache>(s =>
// {
//     return new RedisCache(new RedisCacheOptions
//     {
//         // Use "ProjectName:" as an instance name to namespace keys and avoid conflicts between projects
//         InstanceName = "Mindz",
//         ConnectionMultiplexerFactory = () =>
//             Task.FromResult(s.GetRequiredService<IConnectionMultiplexer>())
//     });
// });
// Create ticket store to store data inside redis
// builder.Services.AddSingleton<ITicketStore, RedisTicketStore>();

var authOptions = new AuthOptions(builder.Configuration);
builder.Services.AddSingleton(authOptions);

builder.Services.AddControllers(options =>
    {
        options.ValueProviderFactories.Add(new ClaimValueProviderFactory());
        options.Conventions.Add(new RouteTokenTransformerConvention(new LowercaseRouteParameterTransformer()));
    })
    .AddNewtonsoftJson();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Tolk API",
        Version = "v1"
    });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "JWT access token. Example: Bearer {token}"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            []
        }
    });
    options.OperationFilter<RemoveClaimBoundParametersOperationFilter>();
    options.DocumentFilter<ApiVersionDocumentFilter>();
});

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

builder.Services.AddHealthChecks();


var app = builder.Build();

app.UseSwagger(options =>
{
    options.RouteTemplate = "api/swagger/{documentName}/swagger.json";
});
app.UseSwaggerUI(options =>
{
    options.RoutePrefix = "api/swagger";
    options.SwaggerEndpoint("/api/swagger/v1/swagger.json", "Tolk API v1");
});

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
app.MapHealthChecks("/health");


app.Run();
