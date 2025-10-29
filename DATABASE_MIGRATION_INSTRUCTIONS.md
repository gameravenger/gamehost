# 📦 Database Migration - Add Google Drive Columns

## ✅ **GOOD NEWS: Upload Already Works!**

Your files are uploading to Google Drive successfully! The database update is optional for now.

However, to get full functionality (tracking uploaded files in the dashboard), you need to add these columns to your database.

---

## 🎯 **Quick Summary**

**Current Status:**
- ✅ Files upload to Google Drive
- ✅ Folder structure created
- ✅ Files organized by game
- ⚠️ Database doesn't track uploads yet

**After Migration:**
- ✅ Everything above +
- ✅ Dashboard shows uploaded files
- ✅ File counts displayed
- ✅ Download links in UI

---

## 📋 **Step-by-Step Migration**

### **Step 1: Open Supabase SQL Editor**

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**

---

### **Step 2: Run the Migration Script**

Copy and paste this SQL:

```sql
-- Add Google Drive upload columns to games table

ALTER TABLE games 
ADD COLUMN IF NOT EXISTS sheets_files JSONB,
ADD COLUMN IF NOT EXISTS sheets_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sheets_uploaded BOOLEAN DEFAULT FALSE,

ADD COLUMN IF NOT EXISTS banners_files JSONB,
ADD COLUMN IF NOT EXISTS banners_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS banners_uploaded BOOLEAN DEFAULT FALSE,

ADD COLUMN IF NOT EXISTS images_files JSONB,
ADD COLUMN IF NOT EXISTS images_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS images_uploaded BOOLEAN DEFAULT FALSE,

ADD COLUMN IF NOT EXISTS upload_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS drive_folder_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS drive_folder_name VARCHAR(500);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_games_drive_folder_id ON games(drive_folder_id);
```

---

### **Step 3: Click "Run"**

Click the **"Run"** button (or press Ctrl+Enter / Cmd+Enter)

You should see:
```
Success. No rows returned
```

---

### **Step 4: Verify Columns Were Added**

Run this verification query:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'games'
AND column_name IN (
  'sheets_files', 'sheets_count', 'sheets_uploaded',
  'banners_files', 'banners_count', 'banners_uploaded',
  'images_files', 'images_count', 'images_uploaded',
  'upload_method', 'drive_folder_id', 'drive_folder_name'
)
ORDER BY column_name;
```

You should see 11 rows showing all the new columns.

---

## 📊 **What These Columns Store:**

### **File Storage Columns** (JSONB)
- `sheets_files` - Metadata for uploaded sheet images
- `banners_files` - Metadata for uploaded banners
- `images_files` - Metadata for uploaded promotional images

**Example data:**
```json
{
  "1": {
    "fileId": "1jJ6peyUffb8RM2ev4QAKLz5KuFixBUle",
    "fileName": "banner.jpg",
    "size": 54848,
    "downloadUrl": "https://drive.google.com/...",
    "uploadedAt": "2025-10-29T19:24:48.297Z",
    "folderPath": "Game_123_Name_Org456/banners"
  }
}
```

### **Count Columns** (INTEGER)
- `sheets_count` - Number of sheets uploaded
- `banners_count` - Number of banners uploaded  
- `images_count` - Number of images uploaded

### **Status Columns** (BOOLEAN)
- `sheets_uploaded` - Whether sheets have been uploaded
- `banners_uploaded` - Whether banners have been uploaded
- `images_uploaded` - Whether images have been uploaded

### **Folder Tracking** (VARCHAR)
- `upload_method` - How files were uploaded (e.g., "google_drive_storage")
- `drive_folder_id` - Google Drive folder ID for this game
- `drive_folder_name` - Folder name (e.g., "Game_123_Name_Org456")

---

## ✅ **After Migration:**

1. Try uploading a file again
2. No more "database update failed" error
3. Files will be tracked in the database
4. Dashboard can show file information

---

## 🚨 **Important Notes:**

### **Safe to Run Multiple Times**
The script uses `IF NOT EXISTS` so it's safe to run multiple times. It won't duplicate columns or cause errors.

### **No Data Loss**
This only ADDS columns. It doesn't modify or delete existing data.

### **Backward Compatible**
Old games without these columns will continue to work normally. The columns allow NULL values.

---

## 🔧 **Troubleshooting:**

### **Error: "permission denied for table games"**
- You need to run this as the database owner
- Go to Supabase dashboard and use the SQL Editor there
- Don't run from a regular database connection

### **Error: "column already exists"**
- The columns are already there!
- No action needed
- Try uploading again - it should work

### **Want to See Current Schema?**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'games' 
ORDER BY ordinal_position;
```

---

## 📋 **Migration Checklist:**

- [ ] Opened Supabase SQL Editor
- [ ] Copied the migration SQL
- [ ] Pasted into new query
- [ ] Clicked "Run"
- [ ] Saw "Success" message
- [ ] Ran verification query
- [ ] Saw 11 new columns listed
- [ ] Tried uploading a file
- [ ] No more "database update failed" error

---

## 🎉 **Benefits After Migration:**

✅ **Full Upload Tracking**
- Know exactly what files are uploaded
- See file counts at a glance
- Track upload dates

✅ **Better Dashboard**
- Display uploaded file lists
- Show download links
- File management UI

✅ **Folder Organization**
- Each game knows its Drive folder
- Easy to find files
- Direct links to Google Drive

✅ **Analytics Possible**
- Track which games have complete uploads
- See total storage used
- Monitor upload activity

---

## ⚠️ **Don't Want to Migrate Yet?**

**That's fine!** Your uploads work WITHOUT the migration.

Files are safe in Google Drive. You can:
- Continue uploading files
- Files are organized automatically
- Access files directly from Google Drive
- Migrate database later when convenient

The migration just adds tracking to your dashboard.

---

## 💡 **Questions?**

- **Q: Will old games break?**
  - A: No, all columns are nullable and have defaults

- **Q: Can I undo this?**
  - A: Yes, but not recommended. Files in Drive are unaffected.

- **Q: Do I lose existing data?**
  - A: No, this only adds columns, never removes data

- **Q: Is this required?**
  - A: No, uploads work without it. This adds tracking.

---

**Run the migration when you're ready!** 🚀

Files are uploading successfully either way!
