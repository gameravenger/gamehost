# 🚨 QUICK FIX: Service Account Storage Quota Error

## Current Error
```
Upload failed: Service Accounts do not have storage quota.
```

---

## ✅ STEP-BY-STEP FIX (Do ALL 3 steps!)

### **STEP 1: Get Service Account Email** 📧

Open your `gameblast-8c2da49f7b6b.json` file and find this line:

```json
"client_email": "gameblast@gameblast-442012.iam.gserviceaccount.com"
```

**Copy this entire email address!** ← This is critical!

---

### **STEP 2: Share Google Drive Folder** 🔗

1. Go to **Google Drive**: https://drive.google.com
2. Find your folder (use this URL to jump directly):
   ```
   https://drive.google.com/drive/folders/1PIgEhMR2-rVHbbfpELSYDakzYlEkWBXM
   ```
3. **Right-click** on the folder name → Click **"Share"**
4. In the share dialog:
   - Click "Add people and groups"
   - **Paste the service account email** (from Step 1)
   - Change dropdown from "Viewer" to **"Editor"** ← MUST be Editor!
   - **UNCHECK** "Notify people"
   - Click **"Share"**

5. **VERIFY:** You should now see the service account email listed under "People with access" with "Editor" next to it.

---

### **STEP 3: Verify Vercel Environment Variables** ⚙️

Go to: **Vercel Dashboard → Project → Settings → Environment Variables**

Check these TWO variables exist:

#### Variable 1: `GOOGLE_SERVICE_ACCOUNT_KEY`
- ✅ Must be set to: The **FULL JSON content** from `gameblast-8c2da49f7b6b.json`
- ✅ Should start with: `{"type":"service_account",...`
- ❌ NOT the file path like `/gameblast-8c2da49f7b6b.json`

#### Variable 2: `GOOGLE_DRIVE_STORAGE_FOLDER_ID`
- ✅ Must be set to: `1PIgEhMR2-rVHbbfpELSYDakzYlEkWBXM`
- ✅ OR the full URL: `https://drive.google.com/drive/folders/1PIgEhMR2-rVHbbfpELSYDakzYlEkWBXM`
- ❌ NOT empty
- ❌ NOT undefined

**For BOTH variables:**
- ✅ Check "Production" environment
- ✅ Check "Preview" environment (optional)
- ✅ Check "Development" environment (optional)

---

### **STEP 4: Redeploy in Vercel** 🚀

1. Go to **Deployments** tab
2. Click **"Redeploy"**
3. **UNCHECK** "Use existing Build Cache"
4. Wait for deployment to complete

---

## 🔍 **How to Verify It's Fixed**

After redeployment, check the Vercel logs (Functions tab):

**✅ GOOD - You should see:**
```
✅ Google Drive Storage initialized successfully
✅ Google Drive upload folder configured: 1PIgEhMR2-rVHbbfpELSYDakzYlEkWBXM
🔍 UPLOAD DEBUG: { inputFolderId: '...', extractedFolderId: '...', fileName: '...' }
☁️  Uploading to folder: 1PIgEhMR2-rVHbbfpELSYDakzYlEkWBXM
✅ DRIVE: Uploaded filename.jpg -> fileId123
```

**❌ BAD - If you see:**
```
❌ GOOGLE_DRIVE_STORAGE_FOLDER_ID is required!
❌ CRITICAL: No parent folder specified!
```
→ Go back to Step 3, the environment variable is not set correctly!

---

## 🚨 **CRITICAL: Why Sharing is Required**

Service accounts are like robots - they have:
- ❌ NO personal Google Drive storage
- ❌ NO "My Drive" folder
- ❌ NO storage quota at all

They can ONLY upload to folders that YOU share with them!

**Think of it like this:**
- ❌ Service account can't save files to its own computer (it has none!)
- ✅ Service account CAN save files to YOUR computer (if you give permission)

---

## 📞 **Still Not Working?**

Run this diagnostic command in Vercel (or locally with same env vars):

```bash
node scripts/test-vercel-env.js
```

This will show you:
- ✅ Which environment variables are set
- ✅ What values they have
- ✅ Service account email
- ✅ Step-by-step instructions

---

## 📋 **Quick Verification Checklist**

- [ ] Service account email copied from JSON file
- [ ] Google Drive folder opened in browser
- [ ] Folder shared with service account email (exactly as in JSON)
- [ ] Permission set to "Editor" (not Viewer!)
- [ ] Service account email appears in "People with access"
- [ ] `GOOGLE_SERVICE_ACCOUNT_KEY` set in Vercel (full JSON)
- [ ] `GOOGLE_DRIVE_STORAGE_FOLDER_ID` set in Vercel (folder ID)
- [ ] Both variables enabled for "Production"
- [ ] Redeployed in Vercel (no cache)
- [ ] Checked deployment logs for success messages

---

## ⏱️ **How Long Does It Take?**

- Folder sharing: **Instant** (Google Drive)
- Environment variables: **Instant** (Vercel saves immediately)
- Deployment: **2-5 minutes** (Vercel build + deploy)
- Total: **~5 minutes** from start to working uploads

---

## 🎯 **The Fix in 3 Sentences**

1. Share your Google Drive folder with the service account email (with Editor permission)
2. Set both environment variables in Vercel (JSON content + folder ID)
3. Redeploy in Vercel

**That's it!** 🚀
