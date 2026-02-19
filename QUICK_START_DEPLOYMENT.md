# ⚡ Quick Start: Vercel Deployment

**Goal:** Get EXOM3 cockpit live at `xom3.io` in under 30 minutes.

---

## 🚀 **5-Minute Setup**

### **Step 1: Connect to Vercel (2 min)**

```bash
cd xom3-app
npm install -g vercel
vercel login
vercel
```

**Or use Dashboard:**
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import from Git → Select `exom3` repo
4. **Set Root Directory:** `xom3-app` ⚠️ **CRITICAL**
5. Click "Deploy"

---

### **Step 2: Add Environment Variables (1 min)**

**Via Dashboard:**
1. Project Settings → Environment Variables
2. Add:
   - `AIRTABLE_API_KEY` = `[Your Airtable PAT]`
   - `AIRTABLE_USHA_BASE_ID` = `app4y7GKkeUfZm8rS`
   - `NODE_ENV` = `production`
3. Select: Production, Preview, Development

**Via CLI:**
```bash
vercel env add AIRTABLE_API_KEY
vercel env add AIRTABLE_USHA_BASE_ID
vercel env add NODE_ENV production
```

---

### **Step 3: Add Domains (1 min)**

**Via Dashboard:**
1. Project Settings → Domains
2. Add: `xom3.io`
3. Add: `kairospheredashboard.me`
4. Copy DNS instructions

**Via CLI:**
```bash
vercel domains add xom3.io
vercel domains add kairospheredashboard.me
```

---

### **Step 4: Configure DNS (1 min)**

**In Hostinger DNS Manager, add for each domain:**

```
CNAME: @ → cname.vercel-dns.com
CNAME: www → cname.vercel-dns.com
TXT: @ → [Vercel verification string]
```

---

### **Step 5: Deploy (1 min)**

```bash
vercel --prod
```

**Or push to Git:**
```bash
git push origin main
```

---

## ✅ **Validation**

**Wait 1-24 hours for DNS, then test:**

1. `https://xom3.io` → Should load cockpit
2. `https://xom3.io/api/health` → Should return `{ "status": "ok" }`
3. `https://kairospheredashboard.me` → Should load cockpit

---

## 📚 **Full Documentation**

- **Detailed Guide:** `VERCEL_DEPLOYMENT_EXECUTION.md`
- **Validation Checklist:** `DEPLOYMENT_VALIDATION_CHECKLIST.md`

---

**That's it. The cockpit is live.** 🎉
