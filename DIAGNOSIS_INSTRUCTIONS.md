# 🔍 Find Out Why Sheets Download is Failing

## Run This Diagnostic Now

1. **Open Supabase Dashboard** → **SQL Editor**
2. **Copy the entire file**: `/workspace/scripts/diagnose-why-sheets-fail.sql`
3. **Paste and Run** in SQL Editor
4. **Read the results** - they will tell you exactly what's wrong

---

## What to Look For in Results

### Section 1: COLUMN CHECK
✅ Should show both:
- `sheets_folder_id` 
- `individual_sheet_files`

❌ If missing either → Run the column creation SQL first!

### Section 2: GAME DATA CHECK
Look at the `sheets_folder_status` column:

**If you see:**
- `✅ Has ID: 1BxiMVs...` → **Good!** Folder ID is saved
- `❌ NULL - THIS IS THE PROBLEM!` → **Bad!** Need to re-upload sheets

### Section 3: INDIVIDUAL SHEET FILES CHECK
- `✅ Has X sheet file IDs` → **Good!** Files are mapped
- `❌ NULL - Need to populate` → **Bad!** Need to re-upload or auto-scan

### Section 4: DIAGNOSIS SUMMARY
This tells you how many games are broken and why.

---

## Quick Fixes Based on Results

### Fix 1: Missing Columns
```sql
-- Run if columns don't exist
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS individual_sheet_files JSONB DEFAULT '{}';
```

### Fix 2: sheets_folder_id is NULL
**Cause**: Sheets were uploaded before columns existed, or upload failed

**Solution**: 
1. Go to your game in organiser dashboard
2. Re-upload your game sheets
3. Verify upload shows success message
4. Re-run this diagnostic to confirm `sheets_folder_id` now has a value

### Fix 3: individual_sheet_files is empty
**Cause**: Sheets uploaded but individual file IDs not saved

**Solution A - Re-upload** (Easiest):
- Just re-upload your sheets through the dashboard

**Solution B - Auto-scan** (If sheets already in Drive):
- Use the auto-scan endpoint (see below)

---

## Using Auto-Scan (Advanced)

If your sheets are already in Google Drive and you don't want to re-upload:

1. Find your game ID from the diagnostic results
2. Make this API call (use Postman or similar):

```
POST /api/organiser/games/{GAME_ID}/auto-scan-sheets
Authorization: Bearer YOUR_ORGANISER_TOKEN
```

This scans your Drive folder and populates `individual_sheet_files` automatically.

---

## Still Failing After Fix?

If diagnostic shows ✅ for everything but download still fails, check:

### 1. User's Payment Status
The user trying to download must have **approved** status:
```sql
SELECT 
    u.username,
    gp.payment_status,
    gp.selected_sheet_numbers
FROM game_participants gp
JOIN users u ON gp.user_id = u.id
WHERE gp.game_id = 'YOUR_GAME_ID';
```

Should show `payment_status = 'approved'`

### 2. Browser Console Errors
- Open browser developer tools (F12)
- Go to Console tab
- Try to download
- Look for error messages

### 3. Server Logs
Check Vercel deployment logs:
- Look for `🚫 SECURITY BLOCK` messages
- Look for `❌` error indicators
- Note the exact error message

---

## Expected Behavior (When Working)

**Upload Process:**
1. Organiser uploads sheets → Google Drive
2. System saves `sheets_folder_id` → Database
3. System saves `individual_sheet_files` → Database (file IDs for each sheet)

**Download Process:**
1. User clicks download
2. System checks `sheets_folder_id` → If NULL, error "sheets not available"
3. System checks `individual_sheet_files[sheetNumber]` → If missing, security blocks download
4. System provides secure download link

---

## Need More Help?

After running the diagnostic, share the results and I can give you exact next steps!
