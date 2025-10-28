# 🚀 Google Drive Storage Setup Guide

## Overview
This system uses your **2TB Google Drive** as cost-effective storage with automatic compression and 2-day cleanup. **Zero additional storage costs!**

## ✅ Benefits
- **💰 Cost-Effective**: Uses your existing 2TB Google Drive plan
- **🗜️ Auto-Compression**: Reduces file sizes by 30-70%
- **🕒 Auto-Cleanup**: Files deleted after 2 days automatically
- **🔒 Secure Access**: Only approved users can download
- **📱 Easy Upload**: Drag & drop interface for organizers

---

## 📋 Setup Steps

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Drive API**

### 2. Create Service Account
1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name: `gamehost-drive-storage`
4. Click **Create and Continue**
5. Grant role: **Editor** (or custom role with Drive access)
6. Click **Done**

### 3. Generate Service Account Key
1. Click on your service account
2. Go to **Keys** tab
3. Click **Add Key** > **Create New Key**
4. Choose **JSON** format
5. Download the JSON file
6. **IMPORTANT**: Keep this file secure!

### 4. Share Google Drive Folder
1. Create a folder in your Google Drive: `GameHost-Storage`
2. Right-click the folder > **Share**
3. Add the service account email (from JSON file)
4. Give **Editor** permission
5. Copy the folder ID from URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

### 5. Environment Variables
Add these to your `.env` file:

```env
# Google Drive Storage Configuration
GOOGLE_SERVICE_ACCOUNT_KEY=/path/to/your/service-account-key.json
GOOGLE_DRIVE_STORAGE_FOLDER_ID=your_folder_id_here

# Optional: Compression settings
COMPRESSION_QUALITY=75
AUTO_CLEANUP_DAYS=2
```

### 6. Test the Setup
```bash
# Test Google Drive connection
node scripts/test-drive-connection.js

# Test file upload
curl -X POST http://localhost:3000/api/organiser/games/GAME_ID/upload-to-drive \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@test-image.jpg" \
  -F "fileType=images"
```

---

## 🔧 Configuration Options

### Compression Settings
```javascript
// In config/google-drive-storage.js
const googleDriveUpload = multer({
  storage: new MulterGoogleDriveStorage({
    compressionQuality: 75, // 1-100 (lower = more compression)
    tempDir: '/tmp',
    parentFolderId: process.env.GOOGLE_DRIVE_STORAGE_FOLDER_ID
  })
});
```

### Auto-Cleanup Schedule
```javascript
// In scripts/cleanup-scheduler.js
// Daily cleanup at 2 AM
cron.schedule('0 2 * * *', cleanupFunction);

// Every 6 hours
cron.schedule('0 */6 * * *', cleanupFunction);
```

---

## 📊 File Type Support

### Supported Formats
- **Images**: JPG, PNG, WebP, GIF (auto-compressed)
- **Documents**: PDF, Word (.doc, .docx)
- **Max Size**: 50MB per file (before compression)

### Compression Rates
- **Images**: 30-70% size reduction
- **PDFs**: 10-20% size reduction
- **Word Docs**: Minimal compression

---

## 🔄 Auto-Cleanup System

### How It Works
1. **Scheduler runs every 6 hours**
2. **Finds files older than 2 days**
3. **Deletes files from Google Drive**
4. **Updates database records**
5. **Logs cleanup statistics**

### Manual Cleanup
```bash
# Trigger manual cleanup
curl -X POST http://localhost:3000/api/organiser/cleanup-old-files \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔒 Security Features

### Access Control
- ✅ User authentication required
- ✅ Organizer ownership verification
- ✅ Approved participant access only
- ✅ One-time download tracking
- ✅ No folder exposure

### File Security
- 🔐 Service account access only
- 🔐 Time-limited file access
- 🔐 Automatic cleanup
- 🔐 No direct URL exposure

---

## 📱 Usage Instructions

### For Organizers
1. Go to **Organizer Dashboard**
2. Click **☁️ Upload to Drive** on any game
3. Select file type: Sheets, Banners, or Images
4. Drag & drop files or click to browse
5. Files are automatically compressed and uploaded
6. Files auto-delete after 2 days

### For Participants
1. Download works exactly the same
2. System automatically uses Google Drive files
3. Secure, one-time downloads maintained
4. No folder access - individual files only

---

## 🚨 Troubleshooting

### Common Issues

**1. "Google Drive not initialized"**
```bash
# Check service account key path
ls -la /path/to/service-account-key.json

# Check environment variables
echo $GOOGLE_SERVICE_ACCOUNT_KEY
echo $GOOGLE_DRIVE_STORAGE_FOLDER_ID
```

**2. "Permission denied"**
- Ensure service account has Editor access to the folder
- Check folder ID is correct
- Verify folder is shared with service account email

**3. "Upload failed"**
- Check file size (max 50MB)
- Verify file type is supported
- Check Google Drive storage quota

**4. "Compression failed"**
- Ensure Sharp library is installed: `npm install sharp`
- Check temp directory permissions: `/tmp`
- Verify file is not corrupted

### Debug Mode
```bash
# Enable debug logging
DEBUG=google-drive:* npm start
```

---

## 💡 Cost Analysis

### Traditional Storage Costs
- **AWS S3**: ~$0.023/GB/month
- **Google Cloud Storage**: ~$0.020/GB/month
- **For 100GB**: ~$2-3/month

### Your Google Drive Solution
- **Cost**: $0 (uses existing 2TB plan)
- **Compression**: Saves 30-70% space
- **Auto-cleanup**: Prevents storage buildup
- **Total Savings**: $24-36/year + compression savings

---

## 🔮 Advanced Features

### Bulk Upload API
```javascript
// Upload multiple files at once
const formData = new FormData();
formData.append('fileType', 'sheets');
files.forEach(file => formData.append('files', file));

fetch('/api/organiser/games/GAME_ID/upload-to-drive', {
  method: 'POST',
  body: formData
});
```

### Custom Compression
```javascript
// Custom compression for specific file types
await driveStorage.compressImage(inputPath, outputPath, 60); // 60% quality
```

### Cleanup Analytics
```javascript
// Get cleanup statistics
const stats = await driveStorage.cleanupOldFiles(2, folderId);
console.log(`Freed ${stats.totalSize} bytes`);
```

---

## 📞 Support

If you encounter any issues:
1. Check this guide first
2. Verify all environment variables
3. Test Google Drive permissions
4. Check server logs for errors
5. Contact support with specific error messages

**Remember**: This solution saves you $24-36/year in storage costs while providing better performance through compression and automatic cleanup! 🎉