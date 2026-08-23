# Database source layout

This directory is the readable source representation of the database's final
structure. Objects are grouped first by PostgreSQL schema and then by object
type:

```text
src/
├── main/
│   ├── functions/<function_name>.sql
│   └── tables/<table_name>.sql
├── users/
│   ├── functions/<function_name>.sql
│   └── tables/<table_name>.sql
└── groups/
    ├── functions/<function_name>.sql
    └── tables/<table_name>.sql
```

Each function file contains one complete `CREATE OR REPLACE FUNCTION`
definition. Each table file contains its `CREATE TABLE` statement followed by
the indexes that belong to that table.

## Deployment artifacts

The deployment pipeline continues to execute these files:

- `database/tables.sql` for the baseline table structure;
- `database/functions.sql` for baseline functions;
- `database/init.sh` for roles and baseline privileges;
- `database/migrations/` for versioned changes to an existing database.

When an object's final definition changes, always update its file under `src/`
first. After the resulting structure has been reviewed, create the versioned
migration that moves an existing database to that final state. A migration
remains an immutable history entry; the corresponding `src/` file shows the
resulting current definition rather than the sequence of changes that produced
it.

Every migration that creates or replaces a function must declare that
function's access policy itself. At minimum, specify `SECURITY DEFINER` and a
fixed `SET search_path = pg_catalog, main, users, groups, public` in the
function definition. Do not rely on an event trigger to amend the function
after creation.
