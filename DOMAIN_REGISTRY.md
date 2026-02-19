# Kairosphere Domain Registry

**Platform:** Hostinger  
**Purpose:** Central registry for all Kairosphere domains  
**Routing:** Each domain routes to specific section of EXOM3 cockpit

---

## 🌐 **Domain Map (VERIFIED CONSTELLATION)**

### **Core EXOM3 / Cockpit Domains**

| Domain | Route | Purpose | Status |
|--------|-------|---------|--------|
| `xom3.io` | `/healthcare` | Primary cockpit domain | ✅ Active |
| `xom3.org` | `/healthcare` | Secondary cockpit domain | ✅ Active |
| `xom3.net` | `/healthcare` | Tertiary cockpit domain | ✅ Active |

### **Kairosphere Healthcare Domains**

| Domain | Route | Purpose | Status |
|--------|-------|---------|--------|
| `kairosdashboard.me` | `/healthcare` | Healthcare cockpit UI | ✅ Active |
| `kairosworkflow.site` | `/healthcare/automation` | Automation cockpit | ✅ Active |

### **Kairosphere System/Engineering**

| Domain | Route | Purpose | Status |
|--------|-------|---------|--------|
| `kairosphere.tech` | `/system` | System/engineering cockpit | ✅ Active |

### **Commerce Domains**

| Domain | Route | Purpose | Status |
|--------|-------|---------|--------|
| `kairosphere.shop` | `/commerce` | Commerce cockpit | ✅ Active |
| `kairosapparel.shop` | `/commerce/apparel` | Apparel lane | ✅ Active |

### **Legacy & Philosophy**

| Domain | Route | Purpose | Status |
|--------|-------|---------|--------|
| `kairoslegacy.xyz` | `/legacy` | Legacy/estate lane | ✅ Active |

### **Business Domain**

| Domain | Route | Purpose | Status |
|--------|-------|---------|--------|
| `pulseverabenefits.com` | `/healthcare` | Insurance business front-end | ✅ Active |

### **❌ Removed Domains (Not Owned)**

| Domain | Status |
|--------|--------|
| `irissphere.com` | ❌ Removed from registry |
| `healthcarepro.com` | ❌ Removed from registry |

---

## 🔧 **DNS Configuration (Hostinger)**

All domains point to:
- **Vercel (Frontend):** CNAME → `cname.vercel-dns.com`
- **Hostinger VPS (Backend):** A Record → VPS IP (for n8n webhooks)

### **Example DNS Setup**

```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: 3600
```

For subdomains:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

---

## 🚀 **Routing Logic**

**File:** `app/page.tsx`

1. Reads `host` header from request
2. Resolves tenant via `resolveTenant(hostname)`
3. Routes to tenant's designated `route` property
4. Falls back to `/healthcare` if no route specified

**Example:**
- `kairospheredashboard.me` → Resolves to "Kairos Dashboard" → Routes to `/healthcare`
- `kairosphereworkflow.site` → Resolves to "Kairos Workflows" → Routes to `/healthcare/automation`

---

## 📋 **Adding New Domains**

### **Step 1: Register Domain (Hostinger)**
1. Go to Hostinger Domain Manager
2. Register new domain
3. Note domain name

### **Step 2: Add to Tenant Registry**
Edit `lib/tenant/registry.ts`:

```typescript
"new-domain": {
  name: "New Domain Name",
  primaryColor: "#HEX",
  secondaryColor: "#HEX",
  logoUrl: "/logo.png",
  domain: "newdomain.com",
  route: "/target-route"
}
```

### **Step 3: Configure DNS (Hostinger)**
- Add CNAME record pointing to Vercel
- Or A record pointing to VPS (if backend only)

### **Step 4: Add to Vercel (if frontend)**
- Vercel Dashboard → Project Settings → Domains
- Add domain
- Follow DNS instructions

### **Step 5: Test**
- Visit domain
- Should route to designated section
- Verify tenant resolution works

---

## 🔍 **Tenant Resolution**

**File:** `lib/tenant/resolve.ts`

```typescript
export function resolveTenant(hostname: string) {
  const match = Object.values(tenants).find(t => t.domain === hostname);
  return match || tenants["default"];
}
```

**How it works:**
1. Searches all tenants for matching domain
2. Returns matched tenant or default (XOM3)
3. Used by routing, theming, and multi-tenant features

---

## ✅ **Verification**

After adding domain:

1. ✅ Domain registered in Hostinger
2. ✅ DNS configured (CNAME or A record)
3. ✅ Added to tenant registry
4. ✅ Route property set
5. ✅ Added to Vercel (if frontend)
6. ✅ Test routing works
7. ✅ SSL certificate active (automatic on Vercel)

---

## 🎯 **Current Status**

**Total Domains:** 10 (verified, owned)  
**Active Routes:** 6  
**Platform:** Hostinger (DNS) + Vercel (Frontend) + Hostinger VPS (Backend)

**All domains point to EXOM3 cockpit with domain-specific routing.**  
**No phantom domains. No DNS drift.**

---

**Registry maintained in:** `lib/tenant/registry.ts`  
**Last Updated:** 2025-01-02
