using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace TolkApi.Database;

public sealed class DatabaseHealthCheck(DatabaseContext databaseContext) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await using var command = databaseContext.GetCon().CreateCommand("SELECT 1");
            command.CommandTimeout = 3;

            var result = await command.ExecuteScalarAsync(cancellationToken);
            return result is 1
                ? HealthCheckResult.Healthy("PostgreSQL is available")
                : HealthCheckResult.Unhealthy("PostgreSQL returned an unexpected result");
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            return HealthCheckResult.Unhealthy("PostgreSQL health check timed out");
        }
        catch (Exception exception)
        {
            return HealthCheckResult.Unhealthy("PostgreSQL is unavailable", exception);
        }
    }
}
