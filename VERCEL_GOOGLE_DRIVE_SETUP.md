# 🚀 Vercel Google Drive Setup Guide

## ❌ Common Errors

### Error 1: ENOENT: no such file or directory
```
ENOENT: no such file or directory, open '/gameblast-8c2da49f7b6b.json'
```
**Cause:** Vercel doesn't have access to the JSON file on your computer.

### Error 2: File not found (folder URL)
```
Upload failed: File not found: https://drive.google.com/drive/folders/...
```
**Cause:** Folder ID needs to be extracted from URL.

---

## ✅ The Solution - 2 Environment Variables Needed

You need to set **TWO** environment variables in Vercel:

### Step 1: Get Your Service Account JSON Content

Open your `gameblast-8c2da49f7b6b.json` file and copy the **entire content**. It looks like this:

```json
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

### Step 2: Get Your Google Drive Folder ID

From your folder URL: `https://drive.google.com/drive/folders/1PIgEhMR2-rVHbbfpELSYDakzYlEkWBXM?usp=sharing`

Extract the ID: `1PIgEhMR2-rVHbbfpELSYDakzYlEkWBXM` (everything between `/folders/` and `?`)

**✅ GOOD NEWS:** The code now accepts both the full URL or just the ID!

### Step 3: Set Environment Variables in Vercel

1. Go to your Vercel Dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**

4. **Add Variable #1:**
   - **Name**: `GOOGLE_SERVICE_ACCOUNT_KEY`
   - **Value**: Paste the **entire JSON content** from your `gameblast-8c2da49f7b6b.json` file
   - **Environments**: Check all (Production, Preview, Development)
   - Click **Save**

5. **Add Variable #2:**
   - **Name**: `GOOGLE_DRIVE_STORAGE_FOLDER_ID`
   - **Value**: EITHER the folder ID (`1PIgEhMR2-rVHbbfpELSYDakzYlEkWBXM`) OR the full URL (both work now!)
   - **Environments**: Check all (Production, Preview, Development)
   - Click **Save**

### Step 4: Verify Folder Permissions

Make sure your Google Drive folder has the correct permissions:

1. Go to Google Drive and find your folder
2. Right-click → Share
3. Change to **"Anyone with the link"** can **"Edit"** (the service account needs write access)
4. Click **Done**

**Important:** The service account needs **Editor** access to upload files!

### Step 5: Redeploy

After adding both environment variables:

1. Go to **Deployments** tab
2. Find your latest deployment
3. Click the **⋯** (three dots) menu
4. Click **Redeploy**

Or simply push a new commit to trigger a deployment.

---

## 🔍 How to Verify

After redeploying, check your Vercel deployment logs. You should see:

✅ **Success message:**
```
📝 Using Google service account from JSON string (Vercel mode)
✅ Google Drive Storage initialized successfully
```

❌ **If you still see errors**, check:
- The JSON is valid (use https://jsonlint.com/ to validate)
- You copied the ENTIRE content including `{` and `}`
- The environment variable is set for "Production" environment
- You redeployed after adding the variable

---

## 💡 Local Development

For local development, you can use either method:

1. **File Path** (recommended for local):
   ```
   GOOGLE_SERVICE_ACCOUNT_KEY=/path/to/gameblast-8c2da49f7b6b.json
   ```

2. **JSON String** (same as Vercel):
   ```
   GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
   ```

---

## 🛡️ Security Note

**NEVER commit the JSON file to git!** 

It's already in `.gitignore`. Always use environment variables for sensitive credentials.

---

## 📋 Quick Checklist

- [ ] Opened `gameblast-8c2da49f7b6b.json` file
- [ ] Copied the **entire JSON content**
- [ ] Went to Vercel → Settings → Environment Variables
- [ ] Added `GOOGLE_SERVICE_ACCOUNT_KEY` with JSON content
- [ ] Selected all environments (Production, Preview, Development)
- [ ] Saved the variable
- [ ] Redeployed the application
- [ ] Checked deployment logs for success message

---

## 🆘 Still Having Issues?

If you're still seeing errors:

1. **Check the JSON format** - Make sure it's valid JSON
2. **Check the environment** - Make sure the variable is set for Production
3. **Check the logs** - Look for the initialization message in Vercel logs
4. **Verify the service account** - Make sure it has Google Drive API access

---

## ✅ What's Fixed

The code now supports **both** methods:
- ✅ JSON string (Vercel) - **RECOMMENDED FOR PRODUCTION**
- ✅ File path (local dev) - Works for local development

You don't need to change anything in the code anymore!
