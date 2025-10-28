# Database Migration Guide

## Issue: Missing `individual_sheet_files` Column

If you see the error: `could not find the 'individual_sheet_files' column of 'games' in the schema cache`

This means the database needs to be updated with the new column for auto-scan functionality.

## Quick Fix (Supabase Dashboard):

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Navigate to SQL Editor** (left sidebar)
4. **Run this SQL command**:

```sql
-- Add individual sheet files support to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS individual_sheet_files JSONB DEFAULT '{}';

-- Add comment explaining the structure
COMMENT ON COLUMN games.individual_sheet_files IS 'JSON object mapping sheet numbers to individual Google Drive file IDs. Format: {"1": "file_id_1", "2": "file_id_2", ...}';
```

5. **Click "Run"**
6. **Verify success** - you should see "Success. No rows returned"

## Alternative: Use Migration File

If you prefer to use the migration file:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `scripts/add-individual-sheet-files.sql`
3. Paste and run in SQL Editor

## Verify Migration

After running the migration, you can verify it worked by:

1. Going to `https://your-app.vercel.app/api/organiser/migration-status`
2. Should return: `{"migrationNeeded": false, "message": "Database is up to date"}`

## What This Enables

- ✅ Auto-scan functionality in game creation
- ✅ Individual sheet file access (no folder exposure)
- ✅ Secure downloads with business protection
- ✅ One-time download tracking per sheet

## Support

If you encounter any issues:
1. Check the Supabase logs for detailed error messages
2. Ensure you have proper database permissions
3. Contact support if the migration fails