# Database Update Guide

## Critical Database Changes Required

To enable multiple sheet purchases for the same game, you need to remove the unique constraint from the `game_participants` table.

### Step 1: Connect to Your Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the following SQL command:

```sql
-- Remove unique constraint to allow multiple sheet purchases for same game
ALTER TABLE game_participants DROP CONSTRAINT IF EXISTS game_participants_game_id_user_id_key;
```

### Step 2: Verify the Change

Run this query to confirm the constraint was removed:

```sql
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'game_participants'::regclass 
AND contype = 'u';
```

You should see no results, confirming the unique constraint is gone.

### Step 3: Test the Changes

1. Try registering for the same game multiple times with different sheets
2. The system should now allow multiple purchases without the duplicate key error

## What This Change Enables

- ✅ Users can buy additional sheets for the same game
- ✅ Each purchase is tracked separately
- ✅ Sheet conflicts are prevented by application logic
- ✅ Payment approvals/rejections work independently for each purchase

## Important Notes

- **Backup First**: Always backup your database before making schema changes
- **Application Logic**: The app now handles duplicate prevention through business logic
- **No Data Loss**: Existing participations remain unchanged
- **Reversible**: You can add the constraint back if needed (though it may fail if duplicate data exists)

## Alternative Method (If SQL Editor Doesn't Work)

If you can't access the SQL Editor, you can also:

1. Use the Supabase CLI
2. Connect via psql
3. Use any PostgreSQL client with your connection string

The important thing is to run the `ALTER TABLE` command to remove the constraint.