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

for migration_file in /migrations/V*.sql; do
  migration_name="$(basename "$migration_file")"
  fixture_file="/tests/before/$migration_name"
  if [ -f "$fixture_file" ]; then
    echo "Loading pre-migration fixture for $migration_name"
    if ! psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test -f "$fixture_file"; then
      exit 1
    fi
  fi
  if ! psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test -f "$migration_file"; then
    exit 1
  fi
done

status=0
for test_file in /tests/*.sql; do
  echo "Running $(basename "$test_file")"
  if ! psql -v ON_ERROR_STOP=1 -U postgres -d tolk_test -f "$test_file"; then
    status=1
  fi
done

exit "$status"
