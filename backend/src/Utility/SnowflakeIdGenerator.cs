namespace TolkApi.Utility;

public sealed class SnowflakeIdGenerator
{
    private const int SequenceBits = 12;
    private const int WorkerIdBits = 5;
    private const int DatacenterIdBits = 5;
    private const int WorkerIdShift = SequenceBits;
    private const int DatacenterIdShift = SequenceBits + WorkerIdBits;
    private const int TimestampShift = SequenceBits + WorkerIdBits + DatacenterIdBits;

    private const long MaxSequence = (1L << SequenceBits) - 1;
    private const long MaxWorkerId = (1L << WorkerIdBits) - 1;
    private const long MaxDatacenterId = (1L << DatacenterIdBits) - 1;
    private const long MaxTimestamp = (1L << 41) - 1;

    private static readonly long EpochMilliseconds =
        new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero).ToUnixTimeMilliseconds();

    private readonly object syncRoot = new();
    private readonly long workerId;
    private readonly long datacenterId;
    private readonly TimeProvider timeProvider;
    private long lastTimestamp = -1;
    private long sequence;

    public SnowflakeIdGenerator(long workerId, long datacenterId, TimeProvider? timeProvider = null)
    {
        if (workerId is < 0 or > MaxWorkerId)
            throw new ArgumentOutOfRangeException(nameof(workerId), workerId,
                $"Worker ID must be between 0 and {MaxWorkerId}.");

        if (datacenterId is < 0 or > MaxDatacenterId)
            throw new ArgumentOutOfRangeException(nameof(datacenterId), datacenterId,
                $"Datacenter ID must be between 0 and {MaxDatacenterId}.");

        this.workerId = workerId;
        this.datacenterId = datacenterId;
        this.timeProvider = timeProvider ?? TimeProvider.System;
    }

    public long CreateId()
    {
        lock (syncRoot)
        {
            var timestamp = GetTimestamp();

            if (timestamp < lastTimestamp)
                throw new InvalidOperationException(
                    $"System clock moved backwards by {lastTimestamp - timestamp} ms.");

            if (timestamp == lastTimestamp)
            {
                sequence = (sequence + 1) & MaxSequence;
                if (sequence == 0)
                    timestamp = WaitForNextMillisecond(lastTimestamp);
            }
            else
            {
                sequence = 0;
            }

            if (timestamp > MaxTimestamp)
                throw new InvalidOperationException("Snowflake timestamp range has been exhausted.");

            lastTimestamp = timestamp;

            return (timestamp << TimestampShift)
                   | (datacenterId << DatacenterIdShift)
                   | (workerId << WorkerIdShift)
                   | sequence;
        }
    }

    private long WaitForNextMillisecond(long previousTimestamp)
    {
        var spinWait = new SpinWait();
        var timestamp = GetTimestamp();

        while (timestamp <= previousTimestamp)
        {
            spinWait.SpinOnce();
            timestamp = GetTimestamp();
        }

        return timestamp;
    }

    private long GetTimestamp()
    {
        var timestamp = timeProvider.GetUtcNow().ToUnixTimeMilliseconds() - EpochMilliseconds;
        if (timestamp < 0)
            throw new InvalidOperationException("Current time is earlier than the Snowflake epoch.");

        return timestamp;
    }
}
