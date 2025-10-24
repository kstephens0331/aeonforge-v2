-- ============================================================================
-- NUCLEAR OPTION - Drops EVERYTHING in public schema
-- This handles overloaded functions and complex dependencies
-- ============================================================================

-- Drop vector extension first (it has its own functions)
DROP EXTENSION IF EXISTS vector CASCADE;

-- Drop uuid-ossp extension
DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;

-- Drop all views first
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public')
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all materialized views
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT matviewname FROM pg_matviews WHERE schemaname = 'public')
    LOOP
        EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS public.' || quote_ident(r.matviewname) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all sequences
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public')
    LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all functions (with argument types to handle overloading)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT
            n.nspname as schema,
            p.proname as name,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    )
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                      r.schema, r.name, r.args);
    END LOOP;
END $$;

-- Drop all types
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
    LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;

-- Drop any remaining custom extensions (skip system extensions)
-- Already dropped vector and uuid-ossp above

-- Clean up auth users (optional - removes all users and their data)
DELETE FROM auth.users;

-- Verify everything is gone
DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count FROM pg_tables WHERE schemaname = 'public';
    SELECT COUNT(*) INTO function_count FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public';

    RAISE NOTICE 'Tables remaining: %', table_count;
    RAISE NOTICE 'Functions remaining: %', function_count;

    IF table_count = 0 AND function_count = 0 THEN
        RAISE NOTICE '✓ PUBLIC SCHEMA IS COMPLETELY CLEAN!';
    ELSE
        RAISE NOTICE '⚠ Some objects still remain. Check manually.';
    END IF;
END $$;
