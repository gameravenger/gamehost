# 📂 Google Drive Folder Organization System

## 🎯 Problem Solved

**Before:** All files uploaded to one folder - chaos! How to know which file belongs to which game/organiser?

**After:** Automatic game-specific folder structure - perfect organization!

---

## 📁 Folder Structure

When you upload files for a game, the system automatically creates this structure:

```
📂 Your Shared Drive Folder (0AD-9scd99lOkUk9PVA)
  │
  ├── 📂 Game_1_ChristmasLottery_Org5
  │    ├── 📊 sheets/
  │    │    ├── sheet1.jpg
  │    │    ├── sheet2.jpg
  │    │    └── sheet3.jpg
  │    ├── 🎨 banners/
  │    │    └── banner.png
  │    └── 📸 images/
  │         └── promo.jpg
  │
  ├── 📂 Game_2_NewYearRaffle_Org5
  │    ├── 📊 sheets/
  │    ├── 🎨 banners/
  │    └── 📸 images/
  │
  └── 📂 Game_3_SummerContest_Org7
       ├── 📊 sheets/
       ├── 🎨 banners/
       └── 📸 images/
```

---

## 🏷️ Folder Naming Convention

Each game folder is named:
```
Game_[GameID]_[GameName]_Org[OrganiserID]
```

**Example:**
- `Game_123_ChristmasLottery_Org456`
- `Game_124_NewYearRaffle_Org456`
- `Game_125_EasterDraw_Org789`

**Why this format?**
- ✅ **Game ID** - Unique identifier, never changes
- ✅ **Game Name** - Easy to identify visually
- ✅ **Organiser ID** - Know who owns this game
- ✅ **Sorted** - Games appear in ID order

---

## 🔄 How It Works

### **Step 1: You Upload Files**
- Go to upload screen
- Select game
- Choose file type (sheets/banners/images)
- Upload files

### **Step 2: System Creates Folders (Automatic)**
```javascript
// System checks: Does folder exist?
Game_123_ChristmasLottery_Org456 → NO
  ↓
Create game folder → Game_123_ChristmasLottery_Org456
  ↓
Create subfolders → sheets/, banners/, images/
```

### **Step 3: Files Are Organized (Automatic)**
```
Upload to root folder (temporary)
  ↓
Move to: Game_123_ChristmasLottery_Org456/sheets/
  ↓
Done! ✅
```

### **Step 4: Upload More Files Later**
```javascript
// System checks: Does folder exist?
Game_123_ChristmasLottery_Org456 → YES
  ↓
Reuse existing folder → sheets/
  ↓
Add new files to existing folder
  ↓
Done! ✅
```

---

## 💾 Database Tracking

For each game, we store:

```json
{
  "game_id": 123,
  "drive_folder_id": "ABC123xyz",
  "drive_folder_name": "Game_123_ChristmasLottery_Org456",
  "sheets_files": {
    "1": {
      "fileId": "DEF456",
      "fileName": "sheet1.jpg",
      "folderPath": "Game_123_ChristmasLottery_Org456/sheets",
      "gameFolderId": "ABC123xyz",
      "targetFolderId": "GHI789"
    }
  }
}
```

---

## 🔍 Finding Your Files

### **In Google Drive:**
1. Open your shared drive folder
2. Look for: `Game_[ID]_[GameName]_Org[YourID]`
3. Open the game folder
4. Files are organized in: `sheets/`, `banners/`, `images/`

### **In Your Dashboard:**
- Game files are automatically linked
- Click "View Files" to see all files for a game
- Download links point to correct folders

---

## ✅ Benefits

### **For Organisers:**
- ✅ Find your game files instantly
- ✅ All files for one game in one place
- ✅ Clear separation between different games
- ✅ Easy to share specific game folder with others

### **For Admins:**
- ✅ Know which organiser owns each game
- ✅ Easy to audit and manage files
- ✅ Quick cleanup of specific games
- ✅ Clear folder structure for support

### **For System:**
- ✅ No file conflicts or overwrites
- ✅ Scalable to thousands of games
- ✅ Easy to implement cleanup/deletion
- ✅ Folder reuse prevents duplicates

---

## 🧹 Cleanup Behavior

When auto-cleanup runs (after 2 days):
- ✅ Deletes old files from folders
- ✅ Keeps folder structure intact
- ✅ Empty folders remain for future uploads
- ✅ Next upload to same game reuses folders

---

## 🚀 Smart Features

### **1. Folder Existence Check**
System checks if folder exists before creating:
- If exists → Reuse it
- If not → Create new one

### **2. Automatic Organization**
You don't need to:
- ❌ Create folders manually
- ❌ Remember folder structure
- ❌ Move files yourself
- ❌ Worry about duplicates

### **3. Conflict Prevention**
- Each game has unique folder
- Files can't mix between games
- Organiser ID in name prevents confusion

### **4. Path Tracking**
Every file knows:
- Which game it belongs to
- Which folder it's in
- When it was uploaded
- When it will be deleted

---

## 📊 Example Upload Flow

**Scenario:** Organiser #5 uploads sheets for Game #123 "Christmas Lottery"

```
1. User clicks "Upload Sheets" for Game 123
   ↓
2. System checks:
   - Does Game_123_ChristmasLottery_Org5 exist? NO
   ↓
3. System creates:
   📂 Game_123_ChristmasLottery_Org5/
     ├── sheets/
     ├── banners/
     └── images/
   ↓
4. User uploads 3 sheet images
   ↓
5. Files temporarily uploaded to root
   ↓
6. System moves files:
   sheet1.jpg → Game_123_ChristmasLottery_Org5/sheets/
   sheet2.jpg → Game_123_ChristmasLottery_Org5/sheets/
   sheet3.jpg → Game_123_ChristmasLottery_Org5/sheets/
   ↓
7. Database updated:
   sheets_count: 3
   drive_folder_name: "Game_123_ChristmasLottery_Org5"
   ↓
8. Done! ✅
```

**Later:** Organiser #5 uploads banners for same game

```
1. User clicks "Upload Banners" for Game 123
   ↓
2. System checks:
   - Does Game_123_ChristmasLottery_Org5 exist? YES
   ↓
3. System reuses existing folder structure
   ↓
4. User uploads banner.png
   ↓
5. File moved to:
   banner.png → Game_123_ChristmasLottery_Org5/banners/
   ↓
6. Done! ✅ (No folder creation needed)
```

---

## 🔐 Permissions

The service account needs:
- ✅ **Editor** access to shared drive folder
- ✅ Ability to **create subfolders**
- ✅ Ability to **move files**
- ✅ Ability to **list/read folders**

---

## 📈 Scalability

This system scales to:
- ✅ Thousands of games
- ✅ Hundreds of organisers
- ✅ Millions of files
- ✅ Organized and fast

**Why?**
- Folders created on-demand (not upfront)
- Folders reused when possible
- No manual management needed
- Google Drive handles the heavy lifting

---

## 🎯 Summary

**What You Get:**
- 📂 Automatic folder creation per game
- 🏷️ Clear naming: Game_ID_Name_OrgID
- 📊 Subfolders: sheets/, banners/, images/
- 🔄 Smart folder reuse
- 💾 Complete database tracking
- 🧹 Compatible with auto-cleanup

**What You DON'T Need To Do:**
- ❌ Create folders manually
- ❌ Organize files yourself
- ❌ Remember folder names
- ❌ Track folder IDs

**Result:**
- ✅ Perfect organization automatically
- ✅ Easy to find any game's files
- ✅ Scalable to any size
- ✅ Professional file management

---

## 🔧 Technical Details

**Folder Creation Function:**
```javascript
createGameFolderStructure(gameId, gameName, organiserId, rootFolderId)
```

**Returns:**
```javascript
{
  gameFolderId: "ABC123",
  sheetsFolderId: "DEF456", 
  bannersFolderId: "GHI789",
  imagesFolderId: "JKL012",
  gameFolderName: "Game_123_ChristmasLottery_Org456"
}
```

**File Move:**
```javascript
moveFile(fileId, targetFolderId)
```

---

This system ensures your Google Drive stays organized, no matter how many games and files you have! 🎉
