using TolkApi.Utility;
using Xunit;

namespace TolkApi.Tests.Utility;

public sealed class SnowflakeIdGeneratorTests
{
    private static readonly DateTimeOffset TestTime =
        new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Constructor_WhenNodeIdentifiersAreOutsideFiveBits_Throws()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new SnowflakeIdGenerator(-1, 0));
        Assert.Throws<ArgumentOutOfRangeException>(() => new SnowflakeIdGenerator(32, 0));
        Assert.Throws<ArgumentOutOfRangeException>(() => new SnowflakeIdGenerator(0, -1));
        Assert.Throws<ArgumentOutOfRangeException>(() => new SnowflakeIdGenerator(0, 32));
    }

    [Fact]
    public void CreateId_WhenClockMovesBackwards_Throws()
    {
        var time = new ManualTimeProvider(TestTime);
        var generator = new SnowflakeIdGenerator(1, 2, time);

        generator.CreateId();
        time.Advance(TimeSpan.FromMilliseconds(-1));

        Assert.Throws<InvalidOperationException>(() => generator.CreateId());
    }

    [Fact]
    public void CreateId_WhenSequenceIsExhausted_WaitsForNextMillisecondWithoutBitOverflow()
    {
        var time = new AdvanceAfterReadsTimeProvider(TestTime, 4097);
        var generator = new SnowflakeIdGenerator(7, 9, time);
        var ids = new HashSet<long>();

        for (var index = 0; index < 4096; index++)
            Assert.True(ids.Add(generator.CreateId()));

        var nextId = generator.CreateId();

        Assert.True(ids.Add(nextId));
        Assert.Equal(0, nextId & 0xfff);
        Assert.Equal(7, (nextId >> 12) & 0x1f);
        Assert.Equal(9, (nextId >> 17) & 0x1f);
    }

    [Fact]
    public void CreateId_ForDifferentNodes_DoesNotOverlap()
    {
        var time = new ManualTimeProvider(TestTime);
        var first = new SnowflakeIdGenerator(1, 1, time);
        var second = new SnowflakeIdGenerator(2, 1, time);

        Assert.NotEqual(first.CreateId(), second.CreateId());
    }

    [Fact]
    public void CreateId_IsMonotonicWithinOneGenerator()
    {
        var time = new ManualTimeProvider(TestTime);
        var generator = new SnowflakeIdGenerator(1, 1, time);

        var previous = generator.CreateId();
        for (var index = 0; index < 10_000; index++)
        {
            if (index % 1000 == 0)
                time.Advance(TimeSpan.FromMilliseconds(1));

            var current = generator.CreateId();
            Assert.True(current > previous);
            previous = current;
        }
    }

    private sealed class ManualTimeProvider(DateTimeOffset initialTime) : TimeProvider
    {
        private DateTimeOffset currentTime = initialTime;

        public override DateTimeOffset GetUtcNow() => currentTime;

        public void Advance(TimeSpan value) => currentTime = currentTime.Add(value);
    }

    private sealed class AdvanceAfterReadsTimeProvider(
        DateTimeOffset initialTime,
        int readsBeforeAdvance) : TimeProvider
    {
        private int reads;

        public override DateTimeOffset GetUtcNow()
        {
            var currentRead = Interlocked.Increment(ref reads);
            return currentRead > readsBeforeAdvance
                ? initialTime.AddMilliseconds(1)
                : initialTime;
        }
    }
}
