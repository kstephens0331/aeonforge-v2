# How to Nuke Supabase and Run Fresh SQL

## ⚠️ WARNING
This will **PERMANENTLY DELETE ALL DATA** in your Supabase project.
- All users will be deleted
- All messages will be deleted
- All projects will be deleted
- All uploaded files will be deleted
- **THIS CANNOT BE UNDONE**

---

## Option 1: Using Supabase Dashboard (Recommended - Easiest)

### Step 1: Nuke the Database

1. Go to https://supabase.com/dashboard/project/pkyqrvrxwhlwkxalsbaz
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Paste this SQL to drop everything:

```sql
-- Drop all tables in public schema
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;

    -- Drop all functions
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public')
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.routine_name) || ' CASCADE';
    END LOOP;
END $$;

-- Clean up auth users (optional - removes all users)
DELETE FROM auth.users;
```

5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

### Step 2: Run the New Schema

1. In the same SQL Editor, click **New Query**
2. Open the file: `c:\Users\usmc3\OneDrive\Documents\Stephens Code Programs\aeonforge-v2\supabase\init.sql`
3. Copy **ENTIRE contents** (it's a long file - make sure you get it all!)
4. Paste into the SQL Editor
5. Click **Run**
6. Wait 30-60 seconds for it to complete
7. You should see "Success. No rows returned" (or similar)

### Step 3: Verify Tables Were Created

Run this query:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see these 8 tables:
- content_flags
- messages
- projects
- rag_documents
- tasks
- token_usage
- user_storage
- users

### Step 4: Create Storage Bucket

1. Go to **Storage** in the left sidebar
2. Click **Create a new bucket**
3. **Name:** `user-files`
4. **Public bucket:** ✅ Check this box
5. Click **Create bucket**

### Step 5: Add Storage Policies

1. Click on the `user-files` bucket
2. Click **Policies** tab
3. Click **New Policy**

**Add Policy 1 - Upload:**
- Click **For full customization**
- **Policy name:** Users can upload own files
- **Policy definition:**

```sql
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Add Policy 2 - Read:**
- Click **New Policy** again
- Click **For full customization**
- **Policy name:** Users can read own files
- **Policy definition:**

```sql
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Add Policy 3 - Delete:**
- Click **New Policy** again
- Click **For full customization**
- **Policy name:** Users can delete own files
- **Policy definition:**

```sql
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Step 6: Done!

Your database is now fresh and ready. You can verify by checking:
- **Database** → Tables (should show 8 tables)
- **Storage** → Buckets (should show `user-files`)

---

## Option 2: Using Supabase CLI

### Step 1: Install Supabase CLI (if not installed)

```bash
npm install -g supabase
```

### Step 2: Login

```bash
supabase login
```

### Step 3: Link to Your Project

```bash
cd "c:\Users\usmc3\OneDrive\Documents\Stephens Code Programs\aeonforge-v2"
supabase link --project-ref pkyqrvrxwhlwkxalsbaz
```

It will ask for your database password.

### Step 4: Reset Database

```bash
supabase db reset
```

This will:
- Drop all tables
- Drop all functions
- Apply migrations from `supabase/migrations/` folder

### Step 5: Apply Our Schema

First, copy the init.sql to migrations:

```bash
# Create migrations folder if it doesn't exist
mkdir -p supabase/migrations

# Copy init.sql as a migration
cp supabase/init.sql supabase/migrations/20250101000000_init.sql
```

Then push:

```bash
supabase db push
```

### Step 6: Create Storage Bucket

**This must be done manually in the dashboard** (see Option 1, Step 4-5 above).

The CLI doesn't support creating storage buckets/policies yet.

---

## Option 3: Nuclear Option (Complete Project Reset)

⚠️ This will reset EVERYTHING including:
- Database
- Auth users
- Storage
- Edge Functions
- All settings

### In Supabase Dashboard:

1. Go to **Settings** → **General**
2. Scroll to bottom
3. Click **Pause Project** (wait a minute)
4. Click **Delete Project**
5. Create a brand new project
6. Update your `.env.local` with new credentials
7. Run `supabase/init.sql` in SQL Editor
8. Create storage bucket manually

**NOT RECOMMENDED** unless you want completely fresh credentials too.

---

## Post-Nuke Checklist

After nuking and running the new SQL:

- [ ] Verify 8 tables exist
- [ ] Verify storage bucket `user-files` exists
- [ ] Verify 3 storage policies exist
- [ ] Test creating a user via Auth UI
- [ ] Run this to verify user was added to `users` table:

```sql
SELECT * FROM public.users;
```

---

## Common Issues

### Issue: "permission denied for schema public"

**Solution:** Make sure you're running as the postgres user. In Supabase dashboard SQL Editor, this should be automatic.

### Issue: "relation already exists"

**Solution:** The table wasn't fully dropped. Run the nuke SQL again from Option 1, Step 1.

### Issue: "extension does not exist"

**Solution:** The pgvector extension needs to be enabled. Run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Issue: Storage policies not working

**Solution:** Make sure:
1. Bucket is set to **public**
2. All 3 policies are added
3. Policy definitions match exactly (copy-paste from above)

---

## Quick Command Reference

```bash
# Supabase CLI
supabase login                           # Login
supabase link --project-ref <ref>        # Link project
supabase db reset                        # Nuke database
supabase db push                         # Push schema
supabase status                          # Check connection

# Test database connection
supabase db branch list
```

---

## Recommended Approach

**For first-time nuke:**
→ Use **Option 1** (Dashboard) - it's visual and you can see each step

**For future deploys:**
→ Use **Option 2** (CLI) - it's faster once you know it works

---

## Need Help?

If you run into issues:

1. Check SQL Editor output for specific error messages
2. Make sure you copied the ENTIRE init.sql file
3. Check that pgvector extension is enabled
4. Verify you're connected to the right project (pkyqrvrxwhlwkxalsbaz)

---

**Ready to nuke?** Start with Option 1, Step 1! 🚀
