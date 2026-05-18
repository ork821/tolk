using Microsoft.Extensions.Options;
using NpgsqlTypes;
using TolkApi.Database;

namespace TolkApi.Reactions;

public sealed class PostReactionStatsSyncOptions
{
    public const string SectionName = "PostReactionStatsSync";

    public bool Enabled { get; set; } = true;

    public int IntervalMinutes { get; set; } = 1;

    public int BatchSize { get; set; } = 1000;
}

public sealed class PostReactionStatsSyncWorker(
    DatabaseContext databaseContext,
    IOptions<PostReactionStatsSyncOptions> options,
    ILogger<PostReactionStatsSyncWorker> logger) : BackgroundService
{
    private readonly PostReactionStatsSyncOptions _options = options.Value;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            logger.LogInformation("Post reaction stats sync worker is disabled");
            return;
        }

        var interval = TimeSpan.FromMinutes(Math.Max(_options.IntervalMinutes, 1));
        var batchSize = Math.Max(_options.BatchSize, 1);

        logger.LogInformation(
            "Post reaction stats sync worker started with interval {IntervalMinutes} minute(s) and batch size {BatchSize}",
            interval.TotalMinutes,
            batchSize);

        using var timer = new PeriodicTimer(interval);

        try
        {
            do
            {
                await SyncOnce(batchSize, stoppingToken);
            } while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            logger.LogInformation("Post reaction stats sync worker is stopping");
        }
    }

    private async Task SyncOnce(int batchSize, CancellationToken cancellationToken)
    {
        try
        {
            await using var command = databaseContext.GetCon()
                .CreateCommand("SELECT * FROM main.sync_post_reaction_stats(@limit)");

            command.Parameters.Add("@limit", NpgsqlDbType.Integer).Value = batchSize;

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                logger.LogWarning("Post reaction stats sync returned no result");
                return;
            }

            var processedEvents = reader.GetInt64(0);
            var affectedStats = reader.GetInt64(1);

            if (processedEvents > 0)
            {
                logger.LogInformation(
                    "Post reaction stats sync processed {ProcessedEvents} event(s), affected {AffectedStats} stat row(s)",
                    processedEvents,
                    affectedStats);
            }
            else
            {
                logger.LogDebug("Post reaction stats sync found no pending events");
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Post reaction stats sync failed");
        }
    }
}
