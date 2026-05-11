using Npgsql;

namespace TolkApi.Database;

public class DatabaseContext
{
    private readonly NpgsqlDataSource _connection;


    public DatabaseContext(string connectionString)
    {
        var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
        var dataSource = dataSourceBuilder.Build();

        _connection = dataSource;
    }


    public NpgsqlDataSource GetCon()
    {
        return _connection;
    }
}