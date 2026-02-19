# ⚡ Phase III — Micro-lane: Vercel Cockpit Deployment

**Status:** Ready for Execution  
**Date:** 2025-01-02  
**Steward:** AKV  
**Goal:** Production-ready cockpit deployment with real domains

---

## 🎯 **What This Lane Delivers**

- ✅ **Single undeniable artifact:** "The cockpit is live at a real domain"
- ✅ **Fastest visible proof:** Open browser → See living cockpit
- ✅ **Real-world leverage:** Unlocks every later client/agent surface
- ✅ **Psychological anchor:** "We're not building toward something; it already exists"

---

## 📋 **Execution Checklist**

### **1. Connect Repo to Vercel** ✅ Repo Binding

#### **Option A: Vercel Dashboard (Recommended for First-Time)**

1. Go to https://vercel.com
2. Click **"Add New Project"**
3. **Import from Git:**
   - Connect GitHub/GitLab account if not already connected
   - Select repository: `exom3` (or your repo name)
4. **Configure Project:**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `xom3-app` ⚠️ **CRITICAL: Set this to `xom3-app`**
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)
   - **Production Branch:** `main` (or your default branch)

#### **Option B: Vercel CLI**

```bash
cd xom3-app
npm install -g vercel
vercel login
vercel
```

**Follow prompts:**
- **Link to existing project?** → No (create new)
- **Project name?** → `exom3` or `xom3-cockpit`
- **Directory?** → `./` (you're already in xom3-app)

**After initial setup, link to Git:**
```bash
vercel git connect
```

---

### **2. Environment Variables** ✅ Secrets & Config

#### **Required Variables:**

| Variable | Value | Source |
|----------|-------|--------|
| `AIRTABLE_API_KEY` | Your Airtable PAT | https://airtable.com/api |
| `AIRTABLE_USHA_BASE_ID` | `app4y7GKkeUfZm8rS` | Fixed value |
| `NODE_ENV` | `production` | Fixed value |

#### **How to Add:**

**Via Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add each variable:
   - **Key:** `AIRTABLE_API_KEY`
   - **Value:** `[Your Airtable Personal Access Token]`
   - **Environment:** Production, Preview, Development (check all)
3. Repeat for `AIRTABLE_USHA_BASE_ID` and `NODE_ENV`

**Via Vercel CLI:**
```bash
cd xom3-app
vercel env add AIRTABLE_API_KEY
# Paste your token when prompted
# Select: Production, Preview, Development

vercel env add AIRTABLE_USHA_BASE_ID
# Enter: app4y7GKkeUfZm8rS
# Select: Production, Preview, Development

vercel env add NODE_ENV production
# Select: Production, Preview, Development
```

**Get Airtable API Key:**
1. Visit: https://airtable.com/api
2. Click **"Create new token"**
3. Name: **"EXOM3 Production"**
4. Grant access to base: `app4y7GKkeUfZm8rS`
5. Copy the token (starts with `pat...`)

---

### **3. Project Build Settings** ✅ Build Config

**Verify in Vercel Dashboard → Project Settings → General:**

- ✅ **Framework:** Next.js
- ✅ **Build Command:** `npm run build`
- ✅ **Output Directory:** `.next` (or leave default)
- ✅ **Install Command:** `npm install`
- ✅ **Root Directory:** `xom3-app` ⚠️ **MUST BE SET**

**If Root Directory is wrong:**
1. Go to Settings → General
2. Scroll to **"Root Directory"**
3. Click **"Edit"**
4. Enter: `xom3-app`
5. Save

---

### **4. Add Primary Domains** ✅ Prod Cockpit Domains

#### **Minimum Required (Start Here):**

1. **`xom3.io`** (Main cockpit)
2. **`kairospheredashboard.me`** (Healthcare dashboard)

#### **How to Add:**

**Via Vercel Dashboard:**
1. Go to Project Settings → Domains
2. Click **"Add Domain"**
3. Enter domain: `xom3.io`
4. Click **"Add"**
5. Vercel will show DNS configuration instructions
6. Repeat for `kairospheredashboard.me`

**Via Vercel CLI:**
```bash
vercel domains add xom3.io
vercel domains add kairospheredashboard.me
```

#### **DNS Configuration (Hostinger):**

For each domain, Vercel will provide DNS records. Add them in Hostinger:

**CNAME Record (Primary):**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: 3600
```

**CNAME Record (WWW):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

**TXT Record (Verification):**
```
Type: TXT
Name: @
Value: [Vercel-provided verification string]
TTL: 3600
```

**After adding DNS records:**
- Wait 1-24 hours for DNS propagation
- Vercel will automatically provision SSL certificates
- Check status in Vercel Dashboard → Domains

---

### **5. Basic Routing Validation** ✅ Route Test

#### **Pre-Deployment Test (Local):**

```bash
cd xom3-app
npm run dev
```

**Test routes:**
- `http://localhost:3000` → Should redirect to `/healthcare`
- `http://localhost:3000/healthcare` → Should load healthcare dashboard
- `http://localhost:3000/api/health` → Should return health status

#### **Post-Deployment Test (Production):**

**After first deploy, test:**

1. **Root Resolution:**
   - Visit: `https://xom3.io`
   - Should redirect to `/healthcare`
   - Verify tenant registry resolves correctly

2. **Direct Route:**
   - Visit: `https://xom3.io/healthcare`
   - Should load healthcare dashboard
   - Verify HPE/HSE UIs render without crashing

3. **Health Check:**
   - Visit: `https://xom3.io/api/health`
   - Should return: `{ "status": "ok", "environment": "production", ... }`

4. **Multi-Domain:**
   - Visit: `https://kairospheredashboard.me`
   - Should redirect to `/healthcare`
   - Verify different domain routes correctly

---

### **6. First Production Deploy** ✅ Live Push

#### **Deploy Command:**

```bash
cd xom3-app
vercel --prod
```

**Or trigger via Git:**
```bash
git add .
git commit -m "Production deployment ready"
git push origin main
```

Vercel will auto-deploy if Git integration is connected.

#### **Deployment Validation:**

**Watch deployment in Vercel Dashboard:**
1. Go to Deployments tab
2. Watch build logs
3. Wait for green ✅ status

**Verify deployment:**
1. ✅ Build completes without errors
2. ✅ All environment variables loaded
3. ✅ Domains show "Valid Configuration"
4. ✅ SSL certificates active (automatic)

**Test live deployment:**
1. Visit: `https://xom3.io`
2. Visit: `https://kairospheredashboard.me`
3. Verify both load correctly
4. Check browser console for errors
5. Test API endpoint: `https://xom3.io/api/health`

---

## 🔍 **Troubleshooting**

### **Build Fails**

**Error: "Module not found"**
- ✅ Check `Root Directory` is set to `xom3-app`
- ✅ Verify `package.json` exists in `xom3-app/`
- ✅ Check build logs for missing dependencies

**Error: "Environment variable missing"**
- ✅ Verify all env vars added in Vercel Dashboard
- ✅ Check env vars are set for "Production" environment
- ✅ Redeploy after adding env vars

### **Domain Not Resolving**

**Error: "Invalid Configuration"**
- ✅ Check DNS records added in Hostinger
- ✅ Wait 1-24 hours for DNS propagation
- ✅ Verify CNAME points to `cname.vercel-dns.com`
- ✅ Check TXT verification record is correct

**Error: "SSL Certificate Pending"**
- ✅ Wait for DNS propagation (can take up to 24 hours)
- ✅ Vercel auto-provisions SSL after DNS resolves
- ✅ Check domain status in Vercel Dashboard

### **Routes Not Working**

**Error: "404 Not Found"**
- ✅ Verify `app/page.tsx` exists and redirects correctly
- ✅ Check tenant registry in `lib/tenant/registry.ts`
- ✅ Verify domain is in tenant registry
- ✅ Check build logs for routing errors

**Error: "API Route Not Found"**
- ✅ Verify API routes exist in `app/api/`
- ✅ Check `vercel.json` rewrites configuration
- ✅ Verify function timeout settings

---

## ✅ **Success Criteria**

Once all steps complete:

- ✅ **Repo connected** to Vercel
- ✅ **Environment variables** configured
- ✅ **Build settings** correct
- ✅ **Primary domains** added (`xom3.io`, `kairospheredashboard.me`)
- ✅ **DNS configured** in Hostinger
- ✅ **First deployment** successful
- ✅ **Root routes** resolve correctly
- ✅ **Health check** endpoint working
- ✅ **Multi-domain routing** functional
- ✅ **SSL certificates** active

**The cockpit is live. You can open a browser, hit your domain, and see the living cockpit.**

---

## 🚀 **Next Steps After Deployment**

1. **Add Remaining Domains:**
   - `xom3.org` (secondary cockpit)
   - `xom3.net` (tertiary cockpit)
   - `kairosworkflow.site` (automation cockpit)
   - `kairosphere.shop` (commerce)
   - `kairosapparel.shop` (apparel)
   - `kairoslegacy.xyz` (legacy lane)
   - `kairosphere.tech` (system cockpit)
   - `pulseverabenefits.com` (business front-end)
   
   **Note:** `irissphere.com` and `healthcarepro.com` removed (not owned)

2. **Monitor Deployment:**
   - Set up Vercel Analytics (optional)
   - Monitor build logs
   - Check error logs

3. **Optimize:**
   - Enable Edge Caching
   - Configure ISR (if needed)
   - Set up preview deployments

---

## 📝 **Quick Reference**

**Deploy to Production:**
```bash
cd xom3-app
vercel --prod
```

**View Deployments:**
```bash
vercel ls
```

**View Logs:**
```bash
vercel logs
```

**Pull Environment Variables:**
```bash
vercel env pull .env.local
```

**Check Domain Status:**
```bash
vercel domains ls
```

---

**Last Updated:** 2025-01-02  
**Status:** Ready for Execution  
**Next:** Execute deployment → Validate → Celebrate 🎉
