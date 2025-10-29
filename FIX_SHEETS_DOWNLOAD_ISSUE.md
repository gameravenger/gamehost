# 🔧 Fix: Game Sheets Download Error

## Problem
When trying to download game sheets, you see the error:
> **"Game sheets not available contact organiser"**

Even though you've uploaded all the game sheets successfully.

---

## Root Cause
The database is missing required columns that store the uploaded sheet information. When sheets are uploaded to Google Drive, the system tries to save the file metadata to the database, but if the columns don't exist, the update fails silently, leaving `sheets_folder_id` as NULL.

---

## Solution (3 Simple Steps)

### Step 1: Run the Database Migration

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and run the migration script**
   - Open the file: `/workspace/scripts/fix-sheets-download-issue.sql`
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click "Run" or press `Ctrl+Enter`

4. **Verify Success**
   - You should see a list of columns at the bottom showing all the added columns
   - Look for the ✅ indicators

### Step 2: Re-upload Your Game Sheets

After running the migration, you need to re-upload your game sheets so the system can properly save the file information:

1. **Login to your organiser dashboard**
2. **Go to your game**
3. **Click "Upload Game Sheets"** (or the sheets upload button)
4. **Select and upload your sheet files again**
5. **Wait for the upload to complete**
6. **Verify you see "Successfully uploaded X sheets"**

### Step 3: Test the Download

1. **Login as a regular user** (or use a test account)
2. **Register for the game** (select a sheet and make payment)
3. **Once approved**, try to download the sheet
4. **You should now be able to download successfully!** 🎉

---

## Technical Details

### What the migration does:

The migration adds these critical columns to the `games` table:

```sql
-- Sheet file tracking
sheets_files JSONB                  -- Stores all sheet file metadata
sheets_count INTEGER                -- Number of sheets uploaded
sheets_uploaded BOOLEAN             -- Upload status flag
sheets_folder_id TEXT               -- ⭐ CRITICAL: Google Drive folder ID
individual_sheet_files JSONB        -- ⭐ CRITICAL: Individual file IDs for secure downloads

-- Other file tracking (banners, images)
banners_files JSONB
banners_count INTEGER
banners_uploaded BOOLEAN
images_files JSONB
images_count INTEGER
images_uploaded BOOLEAN

-- Drive folder tracking
upload_method VARCHAR(50)
drive_folder_id VARCHAR(255)
drive_folder_name VARCHAR(500)
```

### Why re-upload is needed:

When you first uploaded the sheets, the database couldn't save the folder information because the columns didn't exist. By re-uploading after running the migration, the system will now properly save:
- The Google Drive folder ID (`sheets_folder_id`)
- Individual file IDs for each sheet (`individual_sheet_files`)
- File metadata like download URLs

This information is essential for the download system to work.

---

## Troubleshooting

### Issue: Migration fails with "permission denied"
**Solution**: Make sure you're logged in as the database owner in Supabase. The SQL Editor should have full permissions by default.

### Issue: Still getting "sheets not available" after re-upload
**Solution**: Check if the game actually has `sheets_folder_id` set:
1. Go to Supabase Dashboard → Table Editor
2. Open the `games` table
3. Find your game
4. Check if `sheets_folder_id` has a value (should look like a long string)
5. If it's still NULL, check the server logs during upload for errors

### Issue: Upload seems to work but sheets_folder_id is NULL
**Solution**: This usually means there's an error during the upload. Check:
1. `GOOGLE_DRIVE_STORAGE_FOLDER_ID` is set in your environment variables
2. `GOOGLE_SERVICE_ACCOUNT_KEY` is set correctly
3. The service account has permission to create folders and upload files

---

## Prevention

To avoid this issue in the future:
1. Always run ALL migration scripts when setting up a new environment
2. Check the `/workspace/scripts/` folder for any `add-*.sql` migration files
3. Run them in your Supabase database before uploading any game data

---

## Need Help?

If you're still experiencing issues after following these steps:

1. Check the browser console for error messages
2. Check server logs in Vercel Dashboard → Deployments → Logs
3. Verify all environment variables are set correctly
4. Make sure your Google Drive service account has proper permissions

---

## Files Modified/Created

- ✅ Created: `/workspace/scripts/fix-sheets-download-issue.sql` - Complete migration script
- ✅ Created: `/workspace/FIX_SHEETS_DOWNLOAD_ISSUE.md` - This guide

---

**Status**: ✅ Issue identified and fix ready to deploy
**Next Step**: Run the migration script in Supabase SQL Editor
