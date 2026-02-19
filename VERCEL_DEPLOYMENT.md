# Vercel Deployment Guide - EXOM3

**Pattern:** Same as kairospheredashboard.me, kairosphereworkflow.site, xom3.io  
**Platform:** Vercel (Frontend) + Hostinger VPS (Backend/n8n)

---

## 🚀 **Deployment Architecture**

```
Vercel (Frontend)
├── kairospheredashboard.me → /healthcare
├── kairosphereworkflow.site → /healthcare/automation  
├── xom3.io → /healthcare (or public landing)
└── *.vercel.app → /healthcare (preview deployments)

Hostinger VPS (Backend)
├── n8n workflows (https://n8n.srv1058373.hstgr.cloud)
├── Webhook endpoints
└── API services
```

---

## ✅ **Step 1: Vercel Project Setup**

### **Option A: Vercel CLI (Recommended)**

```bash
cd xom3-app
npm install -g vercel
vercel login
vercel
```

Follow prompts:
- **Link to existing project?** → No (create new)
- **Project name?** → `exom3` or `xom3-cockpit`
- **Directory?** → `./xom3-app`

### **Option B: Vercel Dashboard**

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import from Git (GitHub/GitLab) or upload `xom3-app` folder
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `xom3-app`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

---

## ✅ **Step 2: Environment Variables**

In Vercel Dashboard → Project Settings → Environment Variables:

```bash
TENANT_KEY=xom3
AIRTABLE_API_KEY=pat_your_airtable_pat_here
AIRTABLE_BASE_ID=appgAjwWw2Jr2TC0K
AIRTABLE_USHA_BASE_ID=appCkU8L3sdmqaAmI
AIRTABLE_CONTROL_TABLE=Xom3 Control
```

**Or use Vercel CLI:**
```bash
vercel env add TENANT_KEY
vercel env add AIRTABLE_API_KEY
vercel env add AIRTABLE_BASE_ID
vercel env add AIRTABLE_USHA_BASE_ID
vercel env add AIRTABLE_CONTROL_TABLE
```

---

## ✅ **Step 3: Add Domains**

In Vercel Dashboard → Project Settings → Domains:

Add each domain:
1. **kairospheredashboard.me**
2. **kairosphereworkflow.site**
3. **xom3.io** (or subdomain)

Vercel will provide DNS records to add in Hostinger.

---

## ✅ **Step 4: DNS Configuration (Hostinger)**

In Hostinger DNS Manager, add CNAME records:

```
Type: CNAME
Name: @ (or subdomain)
Value: cname.vercel-dns.com
TTL: 3600
```

**Or A Record (if CNAME not supported):**
```
Type: A
Name: @
Value: [Vercel IP - check Vercel dashboard]
TTL: 3600
```

---

## ✅ **Step 5: SSL Certificate**

Vercel automatically provisions SSL certificates for all domains.  
No manual configuration needed.

---

## ✅ **Step 6: Deploy**

### **First Deploy:**
```bash
cd xom3-app
vercel --prod
```

### **Auto-Deploy (Git Integration):**
- Push to `main` branch → Auto-deploys to production
- Push to other branches → Creates preview deployment

---

## 🔧 **Multi-Domain Routing**

The root page (`app/page.tsx`) automatically routes based on hostname:

- `kairospheredashboard.me` → `/healthcare`
- `kairosphereworkflow.site` → `/healthcare/automation`
- `xom3.io` → `/healthcare`
- `*.vercel.app` → `/healthcare` (preview)

**How it works:**
- Vercel passes hostname in `host` header
- Next.js reads header in `app/page.tsx`
- Routes to appropriate section

---

## 📋 **Verification Checklist**

After deployment:

- [ ] All domains added to Vercel project
- [ ] DNS records configured in Hostinger
- [ ] Environment variables set in Vercel
- [ ] SSL certificates active (automatic)
- [ ] Root page routes correctly per domain
- [ ] API endpoints accessible (`/api/usha/test-connection`)
- [ ] Airtable integration working

---

## 🔗 **Backend Integration**

**n8n Webhooks (Hostinger VPS):**
- Lead Intake: `https://n8n.srv1058373.hstgr.cloud/webhook/lead-intake`
- Billing: `https://n8n.srv1058373.hstgr.cloud/webhook/billing-webhook`
- Legacy: `https://n8n.srv1058373.hstgr.cloud/webhook/legacy-artifact`

**Frontend (Vercel):**
- All domains point to same Next.js app
- Routing handled by `app/page.tsx`
- API routes at `/api/*`

---

## 🎯 **Deployment Commands**

```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel

# View deployments
vercel ls

# View logs
vercel logs

# Pull environment variables
vercel env pull .env.local
```

---

## ✅ **You're Ready**

Once deployed:
1. ✅ All domains route correctly
2. ✅ SSL active on all domains
3. ✅ Environment variables loaded
4. ✅ Backend webhooks connected
5. ✅ Multi-tenant routing working

**Same pattern as your previous projects. Clean. Simple. Vercel.**
