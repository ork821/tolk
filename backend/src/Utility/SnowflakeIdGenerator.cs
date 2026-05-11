namespace MindzBackDotNet.Utility;

public sealed class SnowflakeIdGenerator
{
    private readonly long datacenterId;

    private readonly object lockObj = new();

    private readonly long workerId;
    private long lastTimestamp = -1L;
    private long sequence;

    public SnowflakeIdGenerator(long workerId, long datacenterId)
    {
        this.workerId = workerId;
        this.datacenterId = datacenterId;
    }

    public long CreateId()
    {
        lock (lockObj)
        {
            var timestamp = CurrentTimeMillis();

            if (timestamp != lastTimestamp) sequence = 0L;

            if (sequence++ >= 4095)
                while (timestamp <= lastTimestamp)
                    timestamp = CurrentTimeMillis();

            lastTimestamp = timestamp;
            var id = (timestamp << 22) | (datacenterId << 17) | (workerId << 12) | sequence;
            return id;
        }
    }

    private static long CurrentTimeMillis()
    {
        return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    }
}