# Database migrations

Flyway applies SQL migrations from this directory in version order.

Use versioned filenames with two underscores before the description:

```text
V0__migration_pipeline_check.sql
V1__create_example_table.sql
V2__add_example_index.sql
V3__update_example_function.sql
```

Rules:

- Never edit or delete a versioned migration after it has been applied.
- Add a new migration to correct an already deployed migration.
- Keep migrations backward-compatible with the currently deployed backend.
- Test every migration against a recent copy of the production schema.
- Create a database backup before applying destructive changes.
- Do not put secrets or environment-specific values in migration files.

The existing schema created by `database/tables.sql`, `database/functions.sql`,
`database/init.sh`, and `database/defaults.sql` is recorded as Flyway baseline
version `-1`. The intentionally empty `V0__migration_pipeline_check.sql` is then
recorded to verify the migration pipeline. While the service is not deployed,
the baseline SQL files may still be updated and the database recreated from
scratch. After the first production deployment, freeze the baseline and put every
schema change in a new versioned migration starting at `V1`.
