-- ============================================================================
-- Tolk Database Initialization Script
-- ============================================================================

-- 1. Role Creation
-- We use a DO block to safely create the role if it doesn't exist.
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'backend') THEN
        CREATE ROLE backend WITH LOGIN PASSWORD 'qweASD123';
    END IF;
END
$$;

-- 2. Schema Permissions
-- Granting permissions on the 'tolk' database to the 'backend' role.
GRANT CONNECT ON DATABASE tolk TO backend;

-- Ensure schemas exist (if not already created by tables.sql)
CREATE SCHEMA IF NOT EXISTS main;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS groups;

-- 3. Security: Principle of Least Privilege
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA main, users, groups TO backend;

-- Grant CRUD permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA main TO backend;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA users TO backend;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA groups TO backend;

-- Grant permissions on sequences (for IDs)
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA main TO backend;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA users TO backend;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA groups TO backend;

-- Grant permission to execute functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA main TO backend;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA users TO backend;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA groups TO backend;

-- 4. Default Privileges (For future tables created by migrations)
ALTER DEFAULT PRIVILEGES IN SCHEMA main, users, groups GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO backend;
ALTER DEFAULT PRIVILEGES IN SCHEMA main, users, groups GRANT EXECUTE ON FUNCTIONS TO backend;
ALTER DEFAULT PRIVILEGES IN SCHEMA main, users, groups GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO backend;

-- 5. Search Path for cleaner queries
ALTER ROLE backend SET search_path TO main, users, groups, public;

