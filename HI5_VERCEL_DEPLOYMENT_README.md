# HI5 Dashboard Vercel Deployment

This guide explains how to deploy the HI5 dashboard as a separate Vercel project, independent of the main XOM3 cockpit.

## 🎯 Overview

The HI5 dashboard can be deployed as a standalone application with its own Vercel project, allowing HI5 Media Group to have their own branded dashboard while keeping the XOM3 cockpit separate.

## 💰 Cost

**FREE** on Vercel's Hobby plan:
- 100GB bandwidth/month
- Unlimited static deployments
- No additional costs for separate projects

## 🚀 Quick Deployment

### 1. Prerequisites

```bash
# Install Vercel CLI if you haven't already
npm install -g vercel

# Login to Vercel
vercel login
```

### 2. Deploy HI5 Dashboard

```powershell
cd xom3-app
.\deploy-hi5-vercel.ps1
```

Or using bash/cmd:

```bash
cd xom3-app
chmod +x deploy-hi5-vercel.sh
./deploy-hi5-vercel.sh
```

This will:
- Create a new Vercel project called "hi5-dashboard"
- Deploy only the HI5 routes (`/hi5` and `/hi5/monitor`)
- Set up proper routing and security headers

### 3. Configure Environment Variables

In your Vercel dashboard (hi5-dashboard project), add these environment variables:

```env
# Required for HI5 functionality
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_hi5_base_id_here

# N8N webhooks for HI5 workflows
N8N_WEBHOOK_LEAD_INTAKE=https://your-n8n-instance.com/webhook/hi5/lead-intake
N8N_WEBHOOK_RFQ_GENERATION=https://your-n8n-instance.com/webhook/hi5/rfq-generation

# Communication services
RESEND_API_KEY=your_resend_api_key_here
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here

# Optional: Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_vercel_analytics_id_here
```

## 🔧 Manual Deployment

If you prefer manual deployment:

```bash
cd xom3-app
vercel --prod --yes --local-config=vercel.hi5.json
```

## 🌐 URLs

After deployment, your HI5 dashboard will be available at:
- **Production**: `https://hi5-dashboard.vercel.app`
- **Preview**: `https://hi5-dashboard-[branch].vercel.app`

## 🔗 Integration with XOM3

The HI5 dashboard can seamlessly integrate with your existing XOM3 cockpit:

### Option 1: Shared Data Layer
- Both apps can connect to the same Airtable bases
- HI5 sees their own data, XOM3 sees everything

### Option 2: Cross-App Navigation
- Add links between HI5 dashboard and XOM3 cockpit
- Single sign-on capability

### Option 3: Embedded Views
- Embed HI5 dashboard components in XOM3 cockpit
- Or vice versa for unified workflow monitoring

## 🎨 Premium Styling

The HI5 dashboard uses the same premium XOM3 design system:
- Glass morphism panels
- Ambient background effects
- Consistent color scheme and typography
- Mobile-responsive design

## 🔒 Security

- Automatic HTTPS
- Security headers configured
- API routes protected
- Environment variables encrypted

## 🧪 Testing

Test these routes after deployment:
- `/` → Redirects to HI5 dashboard
- `/hi5` → Main HI5 dashboard
- `/hi5/monitor` → Workflow monitor

## 📞 Support

For deployment issues:
1. Check Vercel function logs in dashboard
2. Verify environment variables are set
3. Confirm Airtable API keys are valid

---

**Ready to deploy?** Run `.\deploy-hi5-vercel.ps1` from the `xom3-app` directory!
