# Environment Variables Setup

**The error you're seeing means the Airtable API key isn't configured.**

---

## ✅ **Quick Fix**

1. **Create `.env.local` file in `xom3-app` directory:**
   ```bash
   cd xom3-app
   ```

2. **Create the file:**
   ```bash
   # Windows PowerShell
   New-Item -Path .env.local -ItemType File
   
   # Or create manually in your editor
   ```

3. **Add these lines:**
   ```bash
   # Copy from xom3-app/ENV_LOCAL.template (recommended)
   TENANT_KEY=xom3

   AIRTABLE_API_KEY=your_personal_access_token_here
   # Primary cockpit base (XOM3 Cockpit / Business Pipelines)
   AIRTABLE_BASE_ID=appgAjwWw2Jr2TC0K
   # Optional: Healthcare CRM base (for /app/healthcare)
   AIRTABLE_USHA_BASE_ID=appCkU8L3sdmqaAmI
   # Control surface table (must exist in the base you are pointing at)
   AIRTABLE_CONTROL_TABLE=Xom3 Control
   ```

4. **Get your Airtable API key:**
   - Visit: https://airtable.com/api
   - Click "Create new token"
   - Name it: "EXOM3 CRM"
   - Grant access to bases you will use (at minimum `AIRTABLE_BASE_ID`)
   - Copy the token
   - Paste it in `.env.local` replacing `pat_your_airtable_pat_here`

5. **Restart the dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

---

## 📋 **File Location**

**Important:** The `.env.local` file must be in the `xom3-app` directory:

```
exom3/
  xom3-app/
    .env.local          ← Create this file here
    package.json
    app/
    ...
```

---

## 🔍 **Verify Setup**

After creating `.env.local` and restarting the server, test:

```bash
curl http://localhost:3000/api/usha/test-connection
```

You should see:
```json
{
  "success": true,
  "message": "✅ All three AKV strikes passed - System is live and operational",
  ...
}
```

---

## ⚠️ **Common Issues**

### **Error: "An API key is required"**
- ✅ Check `.env.local` exists in `xom3-app` directory
- ✅ Check file has `AIRTABLE_API_KEY=` line
- ✅ Restart dev server after creating/editing `.env.local`

### **Error: "Base not found"**
- ✅ Check `AIRTABLE_BASE_ID` / `AIRTABLE_USHA_BASE_ID` are correct for your Airtable bases
- ✅ Verify base ID matches your Airtable base

### **Error: "Invalid API key"**
- ✅ Regenerate token at https://airtable.com/api
- ✅ Make sure token has access to base `app4y7GKkeUfZm8rS`

---

## ✅ **After Setup**

Once `.env.local` is configured:

1. ✅ Restart dev server
2. ✅ Test endpoint: `/api/usha/test-connection`
3. ✅ All three strikes should pass

**Your integration will be live.**
