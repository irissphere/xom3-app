# 🔧 Environment Variable Fix

**The issue:** Next.js only loads `.env.local` from the **`xom3-app` directory**, not from the root.

---

## ✅ **Quick Fix**

Your `.env` is in the root directory, but Next.js needs it in `xom3-app`.

### **Option 1: Copy to xom3-app (Recommended)**

```powershell
# Copy .env from root to xom3-app as .env.local
Copy-Item ..\.env xom3-app\.env.local
```

### **Option 2: Create .env.local manually**

1. Go to `xom3-app` directory
2. Create `.env.local` file
3. Copy these lines from your root `.env`:
   ```bash
   TENANT_KEY=xom3
AIRTABLE_API_KEY=your_api_key_here
AIRTABLE_BASE_ID=appgAjwWw2Jr2TC0K
AIRTABLE_CONTROL_TABLE=Xom3 Control
ENABLE_HI5=false
   ```

---

## 🔍 **Verify Setup**

After copying, restart the dev server and test:

```powershell
# Visit in browser:
http://localhost:3000/api/debug/env
```

This will show you if the env vars are loading.

---

## ⚠️ **Why This Happens**

Next.js loads environment variables in this order (from `xom3-app` directory):
1. `.env.local` (highest priority)
2. `.env.development` or `.env.production`
3. `.env`

**It does NOT load from the root directory.**

---

## ✅ **After Fix**

1. Copy `.env` → `xom3-app/.env.local`
2. Restart dev server (`npm run dev`)
3. Test: `http://localhost:3000/api/usha/test-connection`

**Should work now.**
