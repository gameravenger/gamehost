# 🚀 How to Redeploy in Vercel After Setting Environment Variables

## ⚠️ CRITICAL: Environment Variables Don't Auto-Update!

When you add or change environment variables in Vercel, they **DO NOT** automatically apply to your existing deployment!

You **MUST** trigger a new deployment for the changes to take effect.

---

## ✅ Step-by-Step Redeployment

### **Step 1: Add/Change Environment Variable**

1. Go to **Vercel Dashboard** → Your Project
2. Click **Settings** → **Environment Variables**
3. Add or edit the variable
4. Click **Save**

✅ Variable is now saved in Vercel settings

❌ Variable is **NOT YET** active in your app!

---

### **Step 2: Trigger New Deployment**

You have 3 options:

#### **Option A: Redeploy from Vercel Dashboard** (Recommended)

1. Go to **Deployments** tab
2. Find your latest deployment (the one at the top)
3. Click the **⋯** (three dots) menu on the right
4. Click **"Redeploy"**
5. **IMPORTANT:** UNCHECK "Use existing Build Cache"
6. Click **"Redeploy"**

**Why uncheck cache?**
- Ensures fresh build with new environment variables
- Prevents old cached values from being used

#### **Option B: Push a New Commit**

```bash
# Make any small change (even just a comment)
git commit --allow-empty -m "Trigger redeploy for env vars"
git push origin main
```

Vercel will automatically deploy the new commit.

#### **Option C: Redeploy via Vercel CLI**

```bash
vercel --prod
```

---

### **Step 3: Wait for Deployment**

1. Watch the deployment in **Deployments** tab
2. Wait for status to show: ✅ **Ready**
3. Usually takes **2-5 minutes**

---

### **Step 4: Verify Environment Variables**

After deployment completes, check if variables are loaded:

1. Go to your app: `https://your-app.vercel.app/api/organiser/debug/env-check`
2. Login as organiser/admin
3. You'll see:

```json
{
  "success": true,
  "timestamp": "2025-10-29T...",
  "checks": {
    "GOOGLE_SERVICE_ACCOUNT_KEY": {
      "isSet": true,
      "type": "JSON",
      "preview": "{\"type\":\"service_account\",\"project_id\":\"gam..."
    },
    "GOOGLE_DRIVE_STORAGE_FOLDER_ID": {
      "isSet": true,
      "value": "0AD-9scd99lOkUk9PVA",
      "length": 19
    }
  }
}
```

**✅ GOOD:** Both show `isSet: true`
**❌ BAD:** Either shows `isSet: false` → Variable not actually deployed

---

## 🚨 Common Mistakes

### **Mistake #1: Not Redeploying**
```
❌ Problem: Set env var, waited, still doesn't work
✅ Solution: Click "Redeploy" button!
```

### **Mistake #2: Using Build Cache**
```
❌ Problem: Redeployed but still using old values
✅ Solution: Uncheck "Use existing Build Cache" when redeploying
```

### **Mistake #3: Wrong Environment**
```
❌ Problem: Set var for "Preview" only, not "Production"
✅ Solution: Check "Production" when adding variable
```

### **Mistake #4: Typo in Variable Name**
```
❌ Wrong: GOOGLE_DRIVE_STORAGE_FOLDER-ID (hyphen)
❌ Wrong: GOOGLE_DRIVE_FOLDER_ID (missing STORAGE)
✅ Correct: GOOGLE_DRIVE_STORAGE_FOLDER_ID (underscores)
```

### **Mistake #5: Trailing Spaces**
```
❌ Problem: "0AD-9scd99lOkUk9PVA " (space at end)
✅ Solution: "0AD-9scd99lOkUk9PVA" (no spaces)
```

---

## 🔍 How to Check Deployment Logs

### **Step 1: Open Function Logs**

1. Go to **Deployments** tab
2. Click on your latest deployment
3. Click **"Functions"** tab
4. You'll see real-time logs

### **Step 2: Look for These Messages**

**✅ SUCCESS - You should see:**
```
🔍 GOOGLE DRIVE CONFIGURATION CHECK
======================================================================
GOOGLE_SERVICE_ACCOUNT_KEY: SET ({"type":"service_account"...)
GOOGLE_DRIVE_STORAGE_FOLDER_ID: 0AD-9scd99lOkUk9PVA
======================================================================
```

**❌ FAILURE - If you see:**
```
GOOGLE_SERVICE_ACCOUNT_KEY: ❌ NOT SET
GOOGLE_DRIVE_STORAGE_FOLDER_ID: ❌ NOT SET
```

Then environment variables are **NOT** loaded!

---

## 📋 Complete Checklist

Before saying "it doesn't work", verify ALL of these:

- [ ] Environment variable added in Vercel Settings
- [ ] Variable name is EXACTLY: `GOOGLE_DRIVE_STORAGE_FOLDER_ID` (no typos!)
- [ ] Value is the folder ID: `0AD-9scd99lOkUk9PVA` (no extra spaces)
- [ ] **Production** environment is checked (not just Preview/Development)
- [ ] Clicked **"Redeploy"** button after adding variable
- [ ] **UNCHECKED** "Use existing Build Cache" when redeploying
- [ ] Waited for deployment to show: ✅ **Ready**
- [ ] Checked Function logs and see: `GOOGLE_DRIVE_STORAGE_FOLDER_ID: 0AD-9scd99lOkUk9PVA`
- [ ] Tested the debug endpoint: `/api/organiser/debug/env-check`
- [ ] Both variables show `isSet: true` in debug endpoint

---

## 🎯 Quick Test

**To verify everything is working:**

1. Visit: `https://your-app.vercel.app/api/organiser/debug/env-check`
2. Login if needed
3. Check response:
   ```json
   {
     "GOOGLE_DRIVE_STORAGE_FOLDER_ID": {
       "isSet": true,
       "value": "0AD-9scd99lOkUk9PVA"
     }
   }
   ```
4. If `isSet: false` → Redeploy again!
5. If `isSet: true` → Try uploading files!

---

## ⏱️ Timeline

| Step | Time | Status |
|------|------|--------|
| Add env var in Vercel | Instant | Variable saved |
| Click Redeploy | Instant | Build queued |
| Build & Deploy | 2-5 min | Building... |
| Deployment complete | - | ✅ Ready |
| Variables active | Instant | Now usable! |

**Total:** ~3-5 minutes from clicking "Redeploy" to variables being active

---

## 🆘 Still Not Working?

If you've done ALL the steps above and it still doesn't work:

### **1. Check Deployment Status**
```
Vercel Dashboard → Deployments → Latest
Status should be: ✅ Ready (not 🔄 Building or ❌ Failed)
```

### **2. Check Function Logs**
```
Latest Deployment → Functions tab
Look for startup logs with env var check
```

### **3. Test Debug Endpoint**
```
https://your-app.vercel.app/api/organiser/debug/env-check
Should show both variables as "isSet: true"
```

### **4. Take Screenshots**
- Screenshot of Environment Variables page (showing name and first few characters)
- Screenshot of Deployment page (showing status)
- Screenshot of Function logs (showing env var check)
- Screenshot of debug endpoint response

---

## 💡 Pro Tip

**Set ALL environment variables BEFORE deploying:**
- Add all required variables at once
- Then redeploy once
- Saves time vs. deploying multiple times

**Required Variables:**
1. `SUPABASE_URL`
2. `SUPABASE_ANON_KEY`
3. `SUPABASE_SERVICE_KEY`
4. `JWT_SECRET`
5. `GOOGLE_SERVICE_ACCOUNT_KEY` ← JSON content
6. `GOOGLE_DRIVE_STORAGE_FOLDER_ID` ← Folder ID

---

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Debug endpoint shows both variables as `isSet: true`
- ✅ Function logs show folder ID on startup
- ✅ No "parentFolderId not defined" error
- ✅ Upload screen works and files upload successfully
- ✅ Files appear in your Google Drive folder

---

**Remember:** Environment variables need a **NEW DEPLOYMENT** to take effect! 🚀
