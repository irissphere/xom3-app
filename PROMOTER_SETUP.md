# Promoter Account Setup Guide

## What is a Promoter Account?

A Promoter account gives free Pro-level access to sales partners in exchange for referrals.

### Benefits
- **$100 monthly credits** (10,000 Obols)
- **Full Pro-level features** - SMS, voice, social, workflows
- **10% commission** on all referrals for 3 months
- **Free** as long as they stay active

### Requirements
- **Grace Period**: 30 days to get started (no requirements)
- **Monthly Requirement**: Refer at least 1 paying customer per month
- **Failure Action**: If inactive after warning, converts to paid subscription

---

## Creating Promoter Accounts

### Option 1: Via API (Recommended)

```bash
# Create a promoter account
curl -X POST http://localhost:3000/api/promoter \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "promoter-1",
    "email": "john@example.com",
    "name": "John Smith"
  }'
```

### Option 2: Via Browser Console

1. Go to any XOM3 page
2. Open browser console (F12)
3. Run:

```javascript
fetch('/api/promoter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'promoter-1',
    email: 'john@example.com',
    name: 'John Smith'
  })
}).then(r => r.json()).then(console.log);
```

---

## Suggested Promoter Onboarding Flow

### Step 1: Create Supabase Account
1. Go to https://xom3.io (or localhost:3000)
2. Click "Start Free Trial"
3. Sign up with email
4. Note their User ID from Supabase

### Step 2: Convert to Promoter
1. Use the API to create promoter status
2. This upgrades their tier from "trial" to "promoter"

### Step 3: Give Them Their Referral Link
1. Navigate to `/impact` page
2. Copy their unique referral code
3. Share with them

---

## Initial Promoters to Set Up

Based on your plan, here are accounts to create:

| Name | Email | Role | Notes |
|------|-------|------|-------|
| [Promoter 1] | | Sales | Has business contacts |
| [Promoter 2] | | Sales | Runs referral network |
| [Promoter 3] | | Sales | Industry connections |

---

## Checking Promoter Status

### List All Promoters
```bash
curl "http://localhost:3000/api/promoter?all=true"
```

### Check Specific Promoter
```bash
curl "http://localhost:3000/api/promoter?userId=promoter-1"
```

---

## Performance Review (Monthly)

The system automatically tracks:
- Referrals made this period
- Total referrals all-time
- Total earnings
- Days remaining in current period

### Warning System
1. **First miss**: Warning issued, 30 more days to get a referral
2. **Second miss**: Account converts to paid subscription

### What "Convert to Paid" Means
- They keep their account and data
- Tier changes to "starter" (or they can choose higher)
- They start being billed monthly
- They can still earn referral commissions

---

## Quick Commands

```bash
# Create promoter
curl -X POST http://localhost:3000/api/promoter \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID_HERE","email":"email@here.com"}'

# Check status
curl "http://localhost:3000/api/promoter?userId=USER_ID_HERE"

# List all
curl "http://localhost:3000/api/promoter?all=true"

# Get their referral code
curl "http://localhost:3000/api/referral/code" \
  -H "x-user-id: USER_ID_HERE"
```

---

## Promoter Message Template

Send this to new promoters:

```
Welcome to the XOM3 Promoter Program! 🚀

You now have FREE Pro-level access to XOM3.

YOUR REFERRAL LINK: [REFERRAL_URL]
YOUR CODE: [REFERRAL_CODE]

HOW IT WORKS:
1. Share your link with business owners
2. When they sign up and subscribe, you earn 10%
3. Commission paid for 3 months per referral

REQUIREMENTS:
- You have 30 days to get started (grace period)
- After that, refer at least 1 paying customer per month
- If inactive, your account converts to paid ($49/mo)

TIPS:
- Focus on business owners drowning in manual work
- Lead with the $10 free trial offer
- Show them the automation features

Questions? Reply to this message.

Let's build! 🔥
```


