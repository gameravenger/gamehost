# ⚡ QUICK FIX: Add Missing Column

## Problem
You have most columns, but you're **missing `individual_sheet_files`** - this is critical!

---

## Solution: Run This SQL

Copy and paste this into your **Supabase SQL Editor** and run it:

```sql
-- Add the missing critical column
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS individual_sheet_files JSONB DEFAULT '{}';

-- Add helpful comment
COMMENT ON COLUMN games.individual_sheet_files IS 'JSON object mapping sheet numbers to individual Google Drive file IDs';
```

---

## Then Check Your Games Status

Run this to see what's actually in your database:

```sql
-- Check your games and their sheet status
SELECT 
    id,
    name,
    status,
    sheets_folder_id,
    sheets_count,
    sheets_uploaded,
    drive_folder_name,
    CASE 
        WHEN sheets_folder_id IS NOT NULL THEN '✅ Has sheets_folder_id'
        ELSE '❌ NULL - Need to re-upload!'
    END as folder_status
FROM games
WHERE status IN ('upcoming', 'live')
ORDER BY created_at DESC
LIMIT 5;
```

---

## What You'll See:

### Scenario A: `sheets_folder_id` is NULL ❌
**This means**: The sheets were uploaded BEFORE you added the columns, so the data wasn't saved.

**Fix**: Re-upload your game sheets. The system will now properly save the folder ID.

### Scenario B: `sheets_folder_id` has a value ✅ 
**This means**: The folder ID is saved! The issue is just the missing `individual_sheet_files` column.

**Fix**: After adding the column, re-upload sheets OR manually populate it.

---

## After Adding the Column

### Option 1: Re-upload (Easiest)
Just re-upload your sheets through the organiser dashboard. The system will:
1. Upload to Google Drive
2. Save the folder ID to `sheets_folder_id` 
3. Save individual file IDs to `individual_sheet_files`

### Option 2: Use Auto-Scan (If files are already in Drive)
If your sheets are already in Google Drive and you don't want to re-upload:

Make a POST request to:
```
POST /api/organiser/games/{gameId}/auto-scan-sheets
```

This will scan your existing Drive folder and populate the `individual_sheet_files` automatically!

---

## Why This Column is Critical

Look at this code from `/workspace/api/games.js` line 291-316:

```javascript
const individualFiles = game.individual_sheet_files || {};
const fileId = individualFiles[requestedSheet.toString()];

// CRITICAL SECURITY: If no individual file ID, block download completely
if (!fileId) {
  console.log(`🚫 SECURITY BLOCK: No individual file ID for sheet ${requestedSheet}`);
  
  return res.status(503).json({
    error: 'Individual file download not configured',
    message: 'This game requires auto-scanning to enable secure downloads'
  });
}
```

Without `individual_sheet_files`, the download is **blocked for security** - the system won't expose the entire folder!

---

## TL;DR

1. ✅ Run: `ALTER TABLE games ADD COLUMN IF NOT EXISTS individual_sheet_files JSONB DEFAULT '{}';`
2. ✅ Check: Run the SELECT query to see if `sheets_folder_id` is NULL
3. ✅ Re-upload: Upload your game sheets again (or use auto-scan if they're already in Drive)
4. ✅ Test: Try downloading - should work now!
