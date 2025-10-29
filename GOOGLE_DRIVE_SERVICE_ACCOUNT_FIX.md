# 🔧 Google Drive Service Account Upload Fix

## ❌ The Error

```
Upload failed: Service Accounts do not have storage quota. 
Leverage shared drives or use OAuth delegation instead.
```

## 🎯 Why This Happens

Google service accounts **do not have their own storage quota**. They cannot upload files to their own "My Drive" - instead, you must **share a folder with the service account** so it can upload files to YOUR Drive.

---

## ✅ The Solution: Share Folder with Service Account

### Step 1: Find Your Service Account Email

1. Open your `gameblast-8c2da49f7b6b.json` file
2. Find the `client_email` field:

```json
{
  "type": "service_account",
  "project_id": "gameblast-442012",
  "client_email": "gameblast@gameblast-442012.iam.gserviceaccount.com",
  ...
}
```

3. Copy this email (it will look like: `name@project-id.iam.gserviceaccount.com`)

### Step 2: Share Your Google Drive Folder

1. Go to **Google Drive**: https://drive.google.com
2. Find the folder where you want to upload files (e.g., `1PIgEhMR2-rVHbbfpELSYDakzYlEkWBXM`)
3. **Right-click** on the folder → Click **Share**
4. In the "Add people and groups" field:
   - Paste the **service account email** (from Step 1)
5. Change the permission dropdown from "Viewer" to **"Editor"**
6. **UNCHECK** the "Notify people" checkbox (service accounts don't read emails!)
7. Click **Share**

### Step 3: Verify

After sharing, you should see:
- ✅ The service account email listed under "People with access"
- ✅ Permission set to "Editor"
- ✅ No notification sent

---

## 🚨 Common Mistakes

### ❌ Wrong: "Anyone with the link"
```
Sharing with "Anyone with the link" does NOT give the service account access!
```

### ❌ Wrong: "Viewer" Permission
```
Service accounts need "Editor" permission to upload files!
```

### ❌ Wrong: Not Sharing at All
```
Service accounts have NO storage quota - they can't upload to their own Drive!
```

---

## 🎯 What This Means

**Before Fix:**
- Service account tries to upload to its own (non-existent) Drive
- ❌ Error: "Service Accounts do not have storage quota"

**After Fix:**
- Service account uploads to YOUR shared folder
- ✅ Files appear in your Google Drive
- ✅ Service account has "Editor" access to the shared folder

---

## 📋 Complete Checklist

- [ ] Found service account email in JSON file (`client_email` field)
- [ ] Opened Google Drive folder (the one you want to upload to)
- [ ] Clicked "Share" on the folder
- [ ] Added service account email
- [ ] Set permission to "Editor" (not Viewer!)
- [ ] Unchecked "Notify people"
- [ ] Clicked "Share"
- [ ] Verified service account appears in "People with access"

---

## 🔄 After Sharing the Folder

1. Try uploading again - it should work now!
2. Check your Google Drive folder - files should appear there
3. The service account can now:
   - ✅ Upload files to the shared folder
   - ✅ Create subfolders
   - ✅ Organize uploaded files

---

## 📚 Alternative Solutions (If Above Doesn't Work)

### Option A: Use Google Workspace Shared Drive
- Requires Google Workspace account (paid)
- Create a Shared Drive and add service account as member
- More info: https://developers.google.com/workspace/drive/api/guides/about-shareddrives

### Option B: OAuth Delegation
- More complex setup
- Requires domain-wide delegation
- More info: http://support.google.com/a/answer/7281227

**Recommendation:** The simple folder sharing (above) works for 99% of cases!

---

## 🎉 Success!

Once you've shared the folder with the service account email, your uploads should work perfectly! 

The error message will disappear and files will upload to your Google Drive folder. 🚀
