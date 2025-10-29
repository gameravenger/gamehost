# ✅ EXACT FIX - Follow These Steps

## The Problem
The error **"Game sheets not available contact organiser"** appears at line 858 in `/api/games.js`:

```javascript
if (!gameDetails || !gameDetails.sheets_folder_id) {
  return res.status(404).json({ 
    error: 'Game sheets not available. Contact the organiser.' 
  });
}
```

This means `sheets_folder_id` is **NULL** in your database.

---

## Why is it NULL?

You uploaded sheets BEFORE the database had these columns. The files went to Google Drive, but the database couldn't save the folder ID because the column didn't exist.

---

## The Fix (4 Steps)

### Step 1: Add Missing Column (if not done already)

Run in **Supabase SQL Editor**:

```sql
-- Add the critical column that blocks downloads
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS individual_sheet_files JSONB DEFAULT '{}';
```

### Step 2: Verify Your Game's Current State

Run this to see what's actually in your database:

```sql
SELECT 
    id,
    name,
    sheets_folder_id,
    sheets_count,
    individual_sheet_files
FROM games
WHERE status IN ('upcoming', 'live')
ORDER BY created_at DESC
LIMIT 3;
```

**Look at the results:**
- If `sheets_folder_id` = NULL → You MUST re-upload
- If `sheets_folder_id` has a value → Skip to Step 4

### Step 3: Re-Upload Your Game Sheets

**THIS IS REQUIRED** because the database needs to save the folder ID.

1. **Login as organiser** on your platform
2. **Go to your game**
3. **Click "Upload Game Sheets"** or sheets upload button
4. **Select all your sheet files** (PDFs)
5. **Upload** and **wait for success message**
6. **Verify** you see: "Successfully uploaded X sheets to Google Drive"

### Step 4: Verify the Upload Worked

Run this SQL again:

```sql
SELECT 
    id,
    name,
    sheets_folder_id,
    sheets_count,
    individual_sheet_files
FROM games
WHERE status IN ('upcoming', 'live')
ORDER BY created_at DESC
LIMIT 1;
```

**Expected results:**
- ✅ `sheets_folder_id`: Should have a long string (like "1BxiMVs0XRA...")
- ✅ `sheets_count`: Should show number of sheets uploaded
- ✅ `individual_sheet_files`: Should show JSON with sheet mappings

---

## Test the Download

1. **Login as a regular user** (or create test account)
2. **Register for the game** and select a sheet
3. **Make payment** (use test UTR)
4. **As organiser, approve the payment**
5. **As user, go to "My Games"** and try to download
6. **Should work now!** ✅

---

## Troubleshooting

### Issue: Upload button doesn't work
- Check browser console (F12) for errors
- Check if `GOOGLE_DRIVE_STORAGE_FOLDER_ID` is set in Vercel environment variables
- Check if `GOOGLE_SERVICE_ACCOUNT_KEY` is set correctly

### Issue: Upload succeeds but sheets_folder_id still NULL
This means the database update failed. Check:

1. **Do ALL these columns exist?**
```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'games'
AND column_name IN (
    'sheets_files',
    'sheets_count', 
    'sheets_uploaded',
    'sheets_folder_id',
    'individual_sheet_files',
    'drive_folder_id',
    'drive_folder_name'
);
```

Should return 7 rows. If less, add missing columns.

2. **Check server logs** in Vercel → Deployments → Logs
   - Look for upload errors
   - Look for database update errors

### Issue: Still getting error after re-upload
Run the diagnostic SQL:
```sql
-- Check everything
SELECT 
    id,
    name,
    status,
    sheets_folder_id IS NOT NULL as has_folder_id,
    sheets_count,
    sheets_uploaded,
    jsonb_pretty(individual_sheet_files) as individual_files,
    drive_folder_name
FROM games
WHERE status IN ('upcoming', 'live')
ORDER BY created_at DESC;
```

Share the results and I can help further.

---

## Why Re-upload is Necessary

The sheets ARE in Google Drive, but:
- Database doesn't know WHERE (sheets_folder_id = NULL)
- Database doesn't have individual file IDs (individual_sheet_files = empty)

Without this data, the download API cannot:
- Find the folder
- Get individual file IDs
- Provide secure download links

Re-uploading solves this by properly saving all metadata to the database.

---

## Alternative: Manual SQL Update (Advanced)

If you know your Google Drive folder ID, you can manually set it:

```sql
-- Replace YOUR_GAME_ID and YOUR_FOLDER_ID
UPDATE games
SET sheets_folder_id = 'YOUR_GOOGLE_DRIVE_FOLDER_ID'
WHERE id = 'YOUR_GAME_ID';
```

But you'll still need to populate `individual_sheet_files` using the auto-scan endpoint.

---

## Next Steps

1. ✅ Run Step 2 query to check current state
2. ✅ If sheets_folder_id is NULL → Re-upload (Step 3)
3. ✅ Run Step 4 query to verify
4. ✅ Test download as user
5. ✅ Report back if still failing (share query results)

**The re-upload should take less than 2 minutes and will fix the issue!**
