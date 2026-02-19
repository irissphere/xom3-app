import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Expanded knowledge base for common questions
const KNOWLEDGE_BASE: Record<string, string> = {
  // ============================================
  // LEAD MANAGEMENT
  // ============================================
  "how do i add a lead": `To add a lead:
1. Go to the **Leads** page from your dashboard
2. Click **"Add lead"** button in the top right
3. Fill in name, email, phone, and source
4. Click **Save**

You can also use the **⚡ Scrape** button to automatically extract leads from any website!`,

  "how does the scraper work": `The lead scraper extracts contact information from any website:

1. Click **⚡ Scrape** on the Leads page
2. Enter the target URL (e.g., a directory or business page)
3. Click **Start Scraper**

The system will:
• Find all emails on the page
• Extract phone numbers
• Capture business names
• Auto-import them as new leads

Works great for prospecting and building contact lists!`,

  "import leads": `You can import leads several ways:

**Manual Entry**
→ Leads page → Add lead → Fill form

**Web Scraping**
→ Leads page → ⚡ Scrape → Enter URL

**CSV Import** (coming soon)
→ Settings → Import → Upload CSV

**API Integration**
→ POST to \`/api/intakecrm/intake\` with lead data

All leads are automatically deduplicated by email/phone.`,

  "lead statuses": `Leads have 3 statuses:

🟡 **New** - Just captured, not yet contacted
🔵 **Working** - In active communication
🟢 **Closed** - Converted or marked complete

Change status by clicking a lead → Edit → Update posture.`,

  "delete lead": `To delete a lead:
1. Go to **Leads** page
2. Click on the lead to open details
3. Scroll down and click **Delete**
4. Confirm deletion

⚠️ This action cannot be undone!`,

  // ============================================
  // COMMERCE / STORE
  // ============================================
  "how do i add products": `To add products to your store:

1. Go to **Commerce** → **Products**
2. Click **"+ Add Product"**
3. Fill in:
   • Name
   • Price  
   • Stock quantity
   • Category
   • Description
4. Click **Create Product**

Your products sync directly with your Hostinger VPS store!`,

  "commerce": `The Commerce Engine lets you manage your self-hosted store:

• **/commerce** - Dashboard with stats
• **/commerce/products** - Add, edit, delete products
• **/commerce/orders** - Track customer orders

It connects to your Flask API on Hostinger VPS - no monthly platform fees!`,

  "view orders": `To view orders:

1. Go to **Commerce** → **Orders**
2. See all orders with status badges
3. Click any order for details

Order statuses:
🟡 Pending → 🔵 Processing → 🟣 Shipped → 🟢 Delivered

Note: Order endpoints may require API authentication.`,

  "product categories": `Organize products with categories:

When adding/editing a product, enter a category name like:
• Electronics
• Clothing
• Services
• Digital

Categories appear as badges in the product list for easy filtering.`,

  "inventory management": `Track inventory in the Products page:

• **Total Stock** - Sum of all product quantities
• **Catalog Value** - Stock × Price for each product
• **Low Stock** - Products under 10 units show warning

Update stock by editing a product and changing the quantity.`,

  // ============================================
  // SOCIAL CONNECTIONS
  // ============================================
  "connect my socials": `To connect your social accounts:

1. Go to **Dashboard** → **Connect socials**
2. Or visit **/social-connect** directly
3. Click the platform you want to connect (Instagram, Facebook, X, LinkedIn)
4. Authorize XOM3 to access your account

Once connected, you can:
• Auto-capture leads from DMs
• Schedule and publish posts
• Track engagement metrics`,

  "instagram": `To connect Instagram:

1. Go to **/social-connect**
2. Click **Instagram**
3. Log in to your Instagram Business account
4. Authorize XOM3

Requirements:
• Must be a Business or Creator account
• Must be connected to a Facebook Page

Once connected: capture DM leads, schedule posts, track engagement.`,

  "facebook": `To connect Facebook:

1. Go to **/social-connect**
2. Click **Facebook**
3. Select your Facebook Page
4. Grant permissions

Features:
• Auto-capture leads from page messages
• Schedule posts to your page
• Track page insights`,

  "disconnect social": `To disconnect a social account:

1. Go to **/social-connect**
2. Find the connected account
3. Click the **⋯** menu → **Disconnect**
4. Confirm disconnection

Your data remains in XOM3, but we'll stop syncing new content.`,

  // ============================================
  // PRICING & PLANS
  // ============================================
  "what plans are available": `XOM3 offers 4 plans:

**Starter** - $29/mo
• Up to 500 leads
• Basic CRM
• Email support

**Growth** - $79/mo (Most Popular)
• Up to 5,000 leads
• Full automation
• Social integrations

**Pro** - $199/mo
• Unlimited leads
• Advanced analytics
• Priority support

**Enterprise** - Custom
• White-label options
• Dedicated support
• Custom integrations

All plans include a **30-day free trial**! Visit /pricing for details.`,

  "pricing": `Visit **/pricing** to see all plans:

• **Starter** - $29/mo (500 leads)
• **Growth** - $79/mo (5,000 leads) ⭐ Popular
• **Pro** - $199/mo (Unlimited)
• **Enterprise** - Custom pricing

All include 30-day free trial. No credit card required to start!`,

  "upgrade": `To upgrade your plan:

1. Go to **Dashboard** → **Subscription** panel
2. Click **Upgrade**
3. Or visit **/pricing** directly
4. Select your new plan
5. Complete checkout

Upgrades take effect immediately. You'll be prorated for the remaining billing period.`,

  "cancel subscription": `To cancel:

1. Go to **Settings** → **Billing**
2. Click **Manage Subscription**
3. Select **Cancel Plan**
4. Confirm cancellation

Your access continues until the end of your billing period. Data is retained for 30 days after cancellation.`,

  "trial": `All plans include a **30-day free trial**:

• Full access to all features
• No credit card required
• Cancel anytime
• Automatic reminder before trial ends

Start your trial at **/pricing** → Select a plan → **Start Free Trial**`,

  // ============================================
  // AUTOMATION & WORKFLOWS
  // ============================================
  "automation": `XOM3 uses **n8n** for workflow automation:

**Available Automations:**
• Lead intake processing
• Follow-up sequences
• Order notifications
• Low stock alerts
• Social post scheduling

Go to **/automation** to view and configure workflows.`,

  "follow up automation": `Set up automated follow-ups:

1. Go to **/automation**
2. Create new workflow
3. Trigger: "New Lead Added"
4. Actions:
   • Wait 1 day → Send email
   • Wait 3 days → Send SMS
   • Wait 7 days → Create task

Templates available for common sequences!`,

  "webhooks": `XOM3 supports webhooks for integrations:

**Incoming Webhooks:**
• \`/api/intakecrm/intake\` - Add leads
• \`/api/actions/scrape\` - Trigger scraper

**Outgoing Webhooks:**
Configure in n8n to send data to external services when events occur.

API docs: **/docs/api**`,

  // ============================================
  // SETTINGS & ACCOUNT
  // ============================================
  "settings": `Access settings at **/settings**:

• **Profile** - Name, email, avatar
• **Billing** - Plan, payment method, invoices
• **Team** - Add/remove team members
• **Integrations** - API keys, webhooks
• **Notifications** - Email/SMS preferences`,

  "change password": `To change your password:

1. Go to **Settings** → **Profile**
2. Click **Change Password**
3. Enter current password
4. Enter new password (min 8 characters)
5. Confirm and save

For security, you'll be logged out of other devices.`,

  "api keys": `To get your API keys:

1. Go to **Settings** → **Integrations**
2. Click **Generate API Key**
3. Copy and store securely (shown only once!)

Use keys for:
• External integrations
• Custom automations
• Third-party apps`,

  // ============================================
  // GENERAL & HELP
  // ============================================
  "what is xom3": `XOM3 is your all-in-one business cockpit:

🎯 **Lead Management** - Capture, track, and convert leads
📱 **Social Automation** - Connect accounts, schedule posts
🛒 **Commerce Engine** - Self-hosted store management
⚡ **Workflow Automation** - n8n-powered automations
📊 **Analytics** - Track performance across all channels

It's designed to give you complete control over your business operations from one place.`,

  "help": `I can help you with:

• **Leads** - Adding, scraping, managing contacts
• **Commerce** - Products, orders, store setup
• **Social** - Connecting accounts, scheduling
• **Pricing** - Plans and features
• **Automation** - Workflows and triggers
• **Settings** - Account, billing, team

What would you like to know more about?

💡 Tip: Click 👤 above to talk to a human if I can't help!`,

  "contact support": `Need human help? You have options:

1. **Chat Escalation** - Click 👤 in this chat
2. **Email** - support@xom3.io
3. **Dashboard** - Settings → Help → Contact

Response times:
• Chat escalation: 24 hours
• Email: 24-48 hours
• Enterprise: Priority support`,

  "keyboard shortcuts": `XOM3 Keyboard Shortcuts:

**Navigation**
• \`G D\` - Go to Dashboard
• \`G L\` - Go to Leads
• \`G C\` - Go to Commerce
• \`G S\` - Go to Settings

**Actions**
• \`N\` - New lead (on Leads page)
• \`/\` - Focus search
• \`?\` - Show shortcuts

Press \`Esc\` to close modals.`,

  "mobile app": `XOM3 works great on mobile!

Just visit **app.xom3.io** on your phone browser. The interface adapts automatically.

Native apps (iOS/Android) are coming soon. Join the waitlist in Settings → Notifications.`,

  "data export": `To export your data:

1. Go to **Settings** → **Data**
2. Click **Export All Data**
3. Select format (CSV or JSON)
4. Download begins automatically

Includes: leads, orders, products, analytics.`,

  "integrations": `XOM3 integrates with:

**Built-in:**
• Instagram, Facebook, X, LinkedIn
• Stripe (payments)
• n8n (automation)

**Via Webhooks:**
• Zapier
• Make (Integromat)
• Any webhook-compatible service

**API:**
• Full REST API for custom integrations
• Documentation at **/docs/api**`,
};

function findBestMatch(query: string): string | null {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Direct match
  for (const [key, value] of Object.entries(KNOWLEDGE_BASE)) {
    if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
      return value;
    }
  }

  // Keyword matching with expanded terms
  const keywords: Record<string, string[]> = {
    // Leads
    "how do i add a lead": ["add lead", "create lead", "new lead", "add contact", "manual lead"],
    "how does the scraper work": ["scrape", "scraper", "scraping", "extract", "find leads", "web scrape"],
    "import leads": ["import", "csv", "upload leads", "bulk", "migrate"],
    "lead statuses": ["status", "posture", "new working closed", "lead state"],
    "delete lead": ["delete", "remove lead", "erase"],
    
    // Commerce
    "how do i add products": ["product", "add product", "create product", "new product"],
    "commerce": ["store", "shop", "ecommerce", "e-commerce", "commerce dashboard"],
    "view orders": ["order", "orders", "purchase", "sales", "transactions"],
    "product categories": ["category", "categories", "organize products"],
    "inventory management": ["inventory", "stock", "quantity", "catalog"],
    
    // Social
    "connect my socials": ["social", "connect", "link account"],
    "instagram": ["instagram", "ig", "insta"],
    "facebook": ["facebook", "fb", "meta"],
    "disconnect social": ["disconnect", "unlink", "remove account"],
    
    // Pricing
    "what plans are available": ["plan", "plans", "subscription", "tier", "pricing"],
    "pricing": ["price", "cost", "how much", "payment"],
    "upgrade": ["upgrade", "change plan", "better plan"],
    "cancel subscription": ["cancel", "stop subscription", "end plan"],
    "trial": ["trial", "free", "try", "test"],
    
    // Automation
    "automation": ["automate", "automation", "workflow", "n8n"],
    "follow up automation": ["follow up", "followup", "sequence", "drip"],
    "webhooks": ["webhook", "api", "integration", "connect app"],
    
    // Settings
    "settings": ["setting", "settings", "configure", "preferences"],
    "change password": ["password", "security", "login"],
    "api keys": ["api key", "token", "credentials"],
    
    // General
    "what is xom3": ["what is", "about", "xom3", "platform", "overview"],
    "help": ["help", "support", "assist", "guide", "how to"],
    "contact support": ["human", "contact", "email support", "talk to someone"],
    "keyboard shortcuts": ["shortcut", "hotkey", "keyboard"],
    "mobile app": ["mobile", "phone", "app", "ios", "android"],
    "data export": ["export", "download data", "backup"],
    "integrations": ["integrate", "zapier", "connect", "third party"],
  };

  for (const [baseKey, matchKeywords] of Object.entries(keywords)) {
    for (const keyword of matchKeywords) {
      if (normalizedQuery.includes(keyword)) {
        return KNOWLEDGE_BASE[baseKey];
      }
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ reply: "Please send a valid message." }, { status: 400 });
    }

    // Try to find a knowledge base match
    const kbMatch = findBestMatch(message);
    
    if (kbMatch) {
      return NextResponse.json({ reply: kbMatch });
    }

    // If OpenAI key is available, use it for advanced responses
    if (process.env.OPENAI_API_KEY) {
      try {
        const systemPrompt = `You are XOM3 Support, a helpful AI assistant for the XOM3 business platform.

XOM3 is an all-in-one business cockpit that includes:
- Lead Management (CRM, lead capture, web scraping for contacts)
- Commerce Engine (self-hosted store on Hostinger VPS with Flask API)
- Social Automation (connect Instagram, Facebook, X, LinkedIn)
- Workflow Automation (n8n-powered)
- Analytics & Reporting

Key features:
- Lead scraping: Click ⚡ Scrape on /leads to extract contacts from any website
- Commerce: /commerce for dashboard, /commerce/products for CRUD, /commerce/orders for tracking
- Social: /social-connect to link accounts
- Pricing tiers: Starter ($29), Growth ($79), Pro ($199), Enterprise (custom)
- All plans have 30-day free trial, no credit card required

Important URLs:
- /dashboard - Main dashboard with stats
- /leads - Lead management and scraping
- /commerce - Store engine dashboard
- /commerce/products - Product management
- /commerce/orders - Order management
- /pricing - Subscription plans
- /social-connect - Connect social accounts
- /checkout - Subscribe to a plan
- /settings - Account settings

If a user seems frustrated or needs human help, suggest they click the 👤 button in the chat header to escalate to a human, or use the phrase [talk to a human](#escalate) which will show as a clickable link.

Be concise, friendly, and helpful. Use markdown formatting (**bold**, *italic*, \`code\`). Keep responses under 200 words unless detail is needed. If you don't know something specific, suggest checking the relevant page or escalating to human support.`;

        const messages = [
          { role: "system", content: systemPrompt },
          ...(history || []).slice(-6),
          { role: "user", content: message },
        ];

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            return NextResponse.json({ reply });
          }
        }
      } catch (aiError) {
        console.error("OpenAI error:", aiError);
      }
    }

    // Fallback response
    return NextResponse.json({
      reply: `I'm not sure about that specific question. Here's what I can help with:

• **Leads** - Adding, scraping, managing contacts
• **Commerce** - Products, orders, store setup  
• **Social** - Connecting accounts
• **Pricing** - Plans and features
• **Automation** - Workflows and triggers

Try asking about one of these topics, or [talk to a human](#escalate) if you need more help!`,
    });
  } catch (error) {
    console.error("Support chat error:", error);
    return NextResponse.json(
      { reply: "Sorry, something went wrong. Please try again or [talk to a human](#escalate)!" },
      { status: 500 }
    );
  }
}

