#!/bin/sh
set -u

docker-entrypoint.sh postgres &
db_pid=$!

cleanup() {
  kill "$db_pid" 2>/dev/null || true
  wait "$db_pid" 2>/dev/null || true
}
trap cleanup EXIT

# During bootstrap docker-entrypoint.sh starts a temporary postmaster as a
# child. It execs the final postmaster itself only after every init script has
# completed, so the command name distinguishes the final server from the
# temporary one.
until [ "$(cat "/proc/$db_pid/comm" 2>/dev/null || true)" = 'postgres' ] \
  && pg_isready -U postgres -d tolk_test >/dev/null 2>&1; do
  sleep 1
done

assert_init_rejects_role() {
  role_name="$1"
  expected_message="$2"
  output_file="/tmp/init-${role_name}.log"

  if APP_DB_USER="$role_name" APP_DB_PASSWORD=unsafe_test_password \
    /docker-entrypoint-initdb.d/03-init.sh >"$output_file" 2>&1; then
    cat "$output_file"
    echo "init.sh accepted unsafe application role: $role_name" >&2
    exit 1
  fi

  output="$(cat "$output_file")"
  case "$output" in
    *"$expected_message"*) ;;
    *)
      cat "$output_file"
      echo "init.sh rejected $role_name for an unexpected reason" >&2
      exit 1
      ;;
  esac
}

assert_init_rejects_role postgres 'APP_DB_USER must not match POSTGRES_USER'

psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test \
  -c 'CREATE ROLE unsafe_app WITH LOGIN CREATEROLE'
assert_init_rejects_role unsafe_app 'APP_DB_USER has administrative role attributes'
psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test -c 'DROP ROLE unsafe_app'

psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test <<'SQL'
CREATE ROLE unsafe_parent;
CREATE ROLE unsafe_member WITH LOGIN;
GRANT unsafe_parent TO unsafe_member;
SQL
assert_init_rejects_role unsafe_member 'APP_DB_USER inherits another role'
psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test <<'SQL'
REVOKE unsafe_parent FROM unsafe_member;
DROP ROLE unsafe_member;
DROP ROLE unsafe_parent;
SQL

psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test <<'SQL'
CREATE ROLE unsafe_owner WITH LOGIN;
CREATE TABLE main.unsafe_owned (id INTEGER);
ALTER TABLE main.unsafe_owned OWNER TO unsafe_owner;
SQL
assert_init_rejects_role unsafe_owner 'APP_DB_USER owns objects in an application schema'
psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test <<'SQL'
DROP TABLE main.unsafe_owned;
DROP ROLE unsafe_owner;
SQL

psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test <<'SQL'
CREATE ROLE unsafe_catalog_owner WITH LOGIN;
CREATE COLLATION main.unsafe_collation (LOCALE = 'C');
ALTER COLLATION main.unsafe_collation OWNER TO unsafe_catalog_owner;
SQL
assert_init_rejects_role unsafe_catalog_owner 'APP_DB_USER owns objects in an application schema'
psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test <<'SQL'
DROP COLLATION main.unsafe_collation;
DROP ROLE unsafe_catalog_owner;
SQL

psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test <<'SQL'
CREATE ROLE unsafe_column WITH LOGIN;
GRANT SELECT (username) ON users.users TO unsafe_column;
SQL
assert_init_rejects_role unsafe_column 'APP_DB_USER has direct column privileges'
psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test <<'SQL'
REVOKE SELECT (username) ON users.users FROM unsafe_column;
DROP ROLE unsafe_column;
SQL

psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test <<'SQL'
CREATE ROLE unsafe_schema_owner WITH LOGIN;
ALTER SCHEMA main OWNER TO unsafe_schema_owner;
SQL
assert_init_rejects_role unsafe_schema_owner 'APP_DB_USER owns objects in an application schema'
psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test <<'SQL'
ALTER SCHEMA main OWNER TO postgres;
DROP ROLE unsafe_schema_owner;
SQL

for migration_file in /migrations/V*.sql; do
  migration_name="$(basename "$migration_file")"
  fixture_file="/tests/before/$migration_name"
  if [ -f "$fixture_file" ]; then
    echo "Loading pre-migration fixture for $migration_name"
    if ! psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test \
      -v app_user="$APP_DB_USER" -f "$fixture_file"; then
      exit 1
    fi
  fi
  if ! psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test \
    -v app_user="$APP_DB_USER" -f "$migration_file"; then
    exit 1
  fi
done

status=0
for test_file in /tests/*.sql; do
  echo "Running $(basename "$test_file")"
  if ! psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test \
    -v app_user="$APP_DB_USER" -f "$test_file"; then
    status=1
  fi
done

exit "$status"
