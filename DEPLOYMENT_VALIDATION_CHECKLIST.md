# ✅ Vercel Deployment Validation Checklist

**Use this checklist after completing the deployment steps.**

---

## 🔍 **Pre-Deployment Validation**

### **Local Build Test**
- [ ] `cd xom3-app && npm install` completes without errors
- [ ] `npm run build` completes successfully
- [ ] `npm run dev` starts without errors
- [ ] `http://localhost:3000` redirects to `/healthcare`
- [ ] `http://localhost:3000/api/health` returns `{ "status": "ok" }`
- [ ] `http://localhost:3000/healthcare` loads dashboard

---

## 🚀 **Vercel Configuration Validation**

### **Project Settings**
- [ ] Root Directory: `xom3-app` ⚠️ **CRITICAL**
- [ ] Framework: Next.js
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `.next` (or default)
- [ ] Install Command: `npm install`
- [ ] Production Branch: `main` (or your default)

### **Environment Variables**
- [ ] `AIRTABLE_API_KEY` added (Production, Preview, Development)
- [ ] `AIRTABLE_USHA_BASE_ID` = `app4y7GKkeUfZm8rS` (Production, Preview, Development)
- [ ] `NODE_ENV` = `production` (Production, Preview, Development)
- [ ] All variables show "Encrypted" status

### **Domains**
- [ ] `xom3.io` added to Vercel project
- [ ] `kairospheredashboard.me` added to Vercel project
- [ ] Both domains show "Valid Configuration" or "Pending"
- [ ] DNS records added in Hostinger for both domains

---

## 🌐 **DNS Validation**

### **Hostinger DNS Records**
For each domain (`xom3.io`, `kairospheredashboard.me`):

- [ ] CNAME record: `@` → `cname.vercel-dns.com`
- [ ] CNAME record: `www` → `cname.vercel-dns.com`
- [ ] TXT record: `@` → `[Vercel verification string]`

### **DNS Propagation Check**
- [ ] Wait 1-24 hours after adding DNS records
- [ ] Check DNS propagation: `nslookup xom3.io 8.8.8.8`
- [ ] Verify CNAME resolves to Vercel
- [ ] Check domain status in Vercel Dashboard

---

## 📦 **Deployment Validation**

### **Build Process**
- [ ] Deployment triggered (via CLI or Git push)
- [ ] Build logs show no errors
- [ ] Build completes successfully
- [ ] Deployment shows green ✅ status
- [ ] Deployment URL accessible (e.g., `exom3.vercel.app`)

### **Production URLs**
- [ ] `https://xom3.io` loads (or shows DNS pending)
- [ ] `https://kairospheredashboard.me` loads (or shows DNS pending)
- [ ] SSL certificates active (automatic, may take time)

---

## ✅ **Functional Validation**

### **Root Route**
- [ ] `https://xom3.io` redirects to `/healthcare`
- [ ] `https://kairospheredashboard.me` redirects to `/healthcare`
- [ ] Tenant registry resolves correctly per domain

### **Direct Routes**
- [ ] `https://xom3.io/healthcare` loads dashboard
- [ ] `https://xom3.io/hse` loads HSE interface
- [ ] `https://xom3.io/uoi` loads UOI interface
- [ ] No console errors in browser DevTools

### **API Endpoints**
- [ ] `https://xom3.io/api/health` returns:
  ```json
  {
    "status": "ok",
    "environment": "production",
    "checks": { ... }
  }
  ```
- [ ] `https://xom3.io/api/usha/test-connection` works (if Airtable configured)
- [ ] API routes respond without 500 errors

### **Multi-Domain Routing**
- [ ] `xom3.io` → Routes to `/healthcare`
- [ ] `kairospheredashboard.me` → Routes to `/healthcare`
- [ ] Different domains show correct tenant resolution

---

## 🔒 **Security Validation**

### **Headers**
- [ ] `X-Content-Type-Options: nosniff` present
- [ ] `X-Frame-Options: DENY` present
- [ ] `X-XSS-Protection: 1; mode=block` present
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` present

### **SSL**
- [ ] HTTPS enabled on all domains
- [ ] SSL certificate valid (green lock in browser)
- [ ] No mixed content warnings

---

## 📊 **Performance Validation**

### **Load Times**
- [ ] Initial page load < 3 seconds
- [ ] API responses < 1 second
- [ ] No timeout errors

### **Build Output**
- [ ] Build completes in < 5 minutes
- [ ] No build warnings (or acceptable warnings)
- [ ] Bundle size reasonable

---

## 🐛 **Error Validation**

### **Browser Console**
- [ ] No JavaScript errors
- [ ] No network errors
- [ ] No CORS errors
- [ ] No 404 errors for expected routes

### **Vercel Logs**
- [ ] No runtime errors in function logs
- [ ] No environment variable errors
- [ ] No timeout errors

---

## ✅ **Final Sign-Off**

Once all items checked:

- [ ] **Deployment is production-ready**
- [ ] **All domains functional**
- [ ] **All routes working**
- [ ] **Health check passing**
- [ ] **No critical errors**

**Status:** ✅ **DEPLOYMENT COMPLETE**

---

## 🎯 **Quick Test Commands**

```bash
# Test health endpoint
curl https://xom3.io/api/health

# Test root redirect
curl -I https://xom3.io

# Test DNS resolution
nslookup xom3.io 8.8.8.8

# Check SSL certificate
openssl s_client -connect xom3.io:443 -servername xom3.io
```

---

**Last Updated:** 2025-01-02  
**Use this checklist after each deployment to ensure quality.**
