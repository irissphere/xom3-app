/**
 * Email Templates - Premium HTML email templates
 * 
 * Designed for dark-mode email clients with fallbacks.
 * Professional, branded, conversion-optimized.
 */

const STORE_NAME = 'SpaceBaddie Shop';

// ── Base layout wrapper ──
function baseLayout(content: string, preheader: string = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${STORE_NAME}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body { margin: 0; padding: 0; background-color: #070b14; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .dark-bg { background-color: #070b14 !important; }
    .card-bg { background-color: #0d1117 !important; }
    a { text-decoration: none; }
    @media (prefers-color-scheme: light) {
      .dark-bg { background-color: #f8fafc !important; }
      .card-bg { background-color: #ffffff !important; }
      .text-primary { color: #1e293b !important; }
      .text-secondary { color: #64748b !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#070b14;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#070b14;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#070b14;" class="dark-bg">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding:24px 0 32px;">
              <span style="font-size:28px;">&#x1F6CD;&#xFE0F;</span>
              <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;"> ${STORE_NAME}</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;" class="card-bg">
                <tr>
                  <td style="padding:40px 36px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding:32px 0 16px;">
              <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
                &copy; ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.<br>
                <a href="https://spacebaddie.com" style="color:#8b5cf6;">spacebaddie.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Badge component ──
function statusBadge(label: string, color: string) {
  return `<span style="display:inline-block;padding:6px 16px;background:${color}20;color:${color};font-size:13px;font-weight:700;border-radius:999px;letter-spacing:0.5px;text-transform:uppercase;">${label}</span>`;
}

// ── Order Item Row ──
function orderItemRow(item: { name: string; quantity: number; price: number; image_url?: string | null }) {
  return `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td width="48" style="padding-right:14px;">
              <div style="width:48px;height:48px;border-radius:10px;background:${item.image_url ? `url(${item.image_url}) center/cover` : 'linear-gradient(135deg,rgba(255,0,110,0.2),rgba(138,43,226,0.2))'};"></div>
            </td>
            <td style="vertical-align:middle;">
              <span style="font-size:14px;font-weight:600;color:#e2e8f0;" class="text-primary">${item.name}</span>
              <br>
              <span style="font-size:12px;color:#64748b;" class="text-secondary">Qty: ${item.quantity}</span>
            </td>
            <td align="right" style="vertical-align:middle;">
              <span style="font-size:14px;font-weight:700;color:#e2e8f0;" class="text-primary">$${(item.price * item.quantity).toFixed(2)}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ═══════════════════════════════════════════════════════════
// ORDER CONFIRMATION EMAIL
// ═══════════════════════════════════════════════════════════

export interface OrderConfirmationData {
  orderId: string;
  customerName?: string;
  email: string;
  items: Array<{ name: string; quantity: number; price: number; image_url?: string | null }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress?: {
    name?: string;
    line1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  } | null;
  storeUrl: string;
}

export function orderConfirmationEmail(data: OrderConfirmationData): { subject: string; html: string } {
  const firstName = data.customerName?.split(' ')[0] || 'there';

  const itemsHtml = data.items.map(item => orderItemRow(item)).join('');

  const addressHtml = data.shippingAddress ? `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;">
      <tr>
        <td style="padding:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;">
          <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Shipping To</p>
          <p style="margin:0;font-size:14px;color:#cbd5e1;line-height:1.6;">
            ${data.shippingAddress.name || ''}<br>
            ${data.shippingAddress.line1 || ''}<br>
            ${[data.shippingAddress.city, data.shippingAddress.state, data.shippingAddress.postal_code].filter(Boolean).join(', ')}<br>
            ${data.shippingAddress.country || ''}
          </p>
        </td>
      </tr>
    </table>
  ` : '';

  const content = `
    <!-- Success Icon -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,rgba(34,197,94,0.2),rgba(34,197,94,0.08));line-height:72px;text-align:center;">
        <span style="font-size:36px;">&#x2713;</span>
      </div>
    </div>

    <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:#ffffff;text-align:center;letter-spacing:-0.5px;" class="text-primary">
      Order Confirmed!
    </h1>
    <p style="margin:0 0 32px;font-size:15px;color:#94a3b8;text-align:center;line-height:1.5;" class="text-secondary">
      Hey ${firstName}, thanks for your order. Here's your receipt.
    </p>

    <!-- Order ID -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="padding:14px 18px;background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.15);border-radius:12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <span style="font-size:12px;color:#8b5cf6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Order ID</span>
              </td>
              <td align="right">
                <span style="font-size:13px;color:#c4b5fd;font-family:monospace;">${data.orderId.slice(0, 8).toUpperCase()}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Items -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${itemsHtml}
    </table>

    <!-- Totals -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:20px;">
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#64748b;">Subtotal</td>
        <td align="right" style="padding:8px 0;font-size:14px;color:#cbd5e1;">$${data.subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#64748b;">Shipping</td>
        <td align="right" style="padding:8px 0;font-size:14px;color:${data.shipping === 0 ? '#22c55e' : '#cbd5e1'};">${data.shipping === 0 ? 'FREE' : '$' + data.shipping.toFixed(2)}</td>
      </tr>
      ${data.tax > 0 ? `<tr>
        <td style="padding:8px 0;font-size:14px;color:#64748b;">Tax</td>
        <td align="right" style="padding:8px 0;font-size:14px;color:#cbd5e1;">$${data.tax.toFixed(2)}</td>
      </tr>` : ''}
      <tr>
        <td colspan="2" style="padding:12px 0 0;"><div style="height:1px;background:rgba(255,255,255,0.08);"></div></td>
      </tr>
      <tr>
        <td style="padding:16px 0 0;font-size:18px;font-weight:800;color:#ffffff;" class="text-primary">Total</td>
        <td align="right" style="padding:16px 0 0;font-size:22px;font-weight:800;color:#22d3ee;">$${data.total.toFixed(2)}</td>
      </tr>
    </table>

    ${addressHtml}

    <!-- CTA Buttons -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:32px;">
      <tr>
        <td align="center">
          <a href="${data.storeUrl}/orders" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#ffffff;font-size:15px;font-weight:700;border-radius:12px;text-decoration:none;">
            Track Your Order
          </a>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-top:16px;">
          <a href="${data.storeUrl}/shop" style="font-size:14px;color:#8b5cf6;text-decoration:none;">
            Continue Shopping &rarr;
          </a>
        </td>
      </tr>
    </table>

    <!-- Trust Signals -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:32px;">
      <tr>
        <td align="center" style="padding:16px;background:rgba(255,255,255,0.02);border-radius:12px;">
          <span style="font-size:12px;color:#475569;">&#x1F512; Secure payment &nbsp;|&nbsp; &#x1F4E6; Fast delivery &nbsp;|&nbsp; &#x2764;&#xFE0F; 100% satisfaction</span>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: `Order Confirmed - #${data.orderId.slice(0, 8).toUpperCase()}`,
    html: baseLayout(content, `Your order #${data.orderId.slice(0, 8).toUpperCase()} has been confirmed! Total: $${data.total.toFixed(2)}`),
  };
}


// ═══════════════════════════════════════════════════════════
// ORDER STATUS UPDATE EMAIL
// ═══════════════════════════════════════════════════════════

export interface OrderStatusUpdateData {
  orderId: string;
  customerName?: string;
  email: string;
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  trackingNumber?: string;
  trackingUrl?: string;
  storeUrl: string;
}

const STATUS_CONFIG: Record<string, { icon: string; title: string; message: string; color: string; badge: string }> = {
  processing: {
    icon: '&#x2699;&#xFE0F;',
    title: 'Order Being Prepared',
    message: 'Great news! Your order is being prepared and will ship soon.',
    color: '#f59e0b',
    badge: 'Processing',
  },
  shipped: {
    icon: '&#x1F4E6;',
    title: 'Order Shipped!',
    message: 'Your order is on its way! You can track your package below.',
    color: '#3b82f6',
    badge: 'Shipped',
  },
  delivered: {
    icon: '&#x2705;',
    title: 'Order Delivered!',
    message: 'Your order has been delivered. We hope you love your purchase!',
    color: '#22c55e',
    badge: 'Delivered',
  },
  cancelled: {
    icon: '&#x274C;',
    title: 'Order Cancelled',
    message: 'Your order has been cancelled. If you have questions, please reach out.',
    color: '#ef4444',
    badge: 'Cancelled',
  },
  refunded: {
    icon: '&#x1F4B0;',
    title: 'Refund Issued',
    message: 'A refund has been issued for your order. It may take 5-10 business days to appear.',
    color: '#8b5cf6',
    badge: 'Refunded',
  },
};

export function orderStatusUpdateEmail(data: OrderStatusUpdateData): { subject: string; html: string } {
  const config = STATUS_CONFIG[data.status] || STATUS_CONFIG.processing;
  const firstName = data.customerName?.split(' ')[0] || 'there';

  const trackingHtml = data.trackingNumber ? `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;">
      <tr>
        <td style="padding:18px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.15);border-radius:14px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:1px;">Tracking Number</p>
          <p style="margin:0;font-size:16px;color:#93c5fd;font-family:monospace;font-weight:600;">${data.trackingNumber}</p>
          ${data.trackingUrl ? `<a href="${data.trackingUrl}" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#3b82f6;color:#ffffff;font-size:13px;font-weight:600;border-radius:8px;text-decoration:none;">Track Package</a>` : ''}
        </td>
      </tr>
    </table>
  ` : '';

  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;width:72px;height:72px;border-radius:50%;background:${config.color}15;line-height:72px;text-align:center;">
        <span style="font-size:36px;">${config.icon}</span>
      </div>
    </div>

    <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:#ffffff;text-align:center;letter-spacing:-0.5px;">${config.title}</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#94a3b8;text-align:center;line-height:1.5;">
      Hey ${firstName}, ${config.message.toLowerCase()}
    </p>
    <div style="text-align:center;margin-bottom:28px;">
      ${statusBadge(config.badge, config.color)}
    </div>

    <!-- Order Reference -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="padding:14px 18px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td><span style="font-size:12px;color:#64748b;font-weight:600;">Order</span></td>
              <td align="right"><span style="font-size:13px;color:#cbd5e1;font-family:monospace;">#${data.orderId.slice(0, 8).toUpperCase()}</span></td>
            </tr>
            <tr>
              <td style="padding-top:6px;"><span style="font-size:12px;color:#64748b;font-weight:600;">Total</span></td>
              <td align="right" style="padding-top:6px;"><span style="font-size:14px;color:#22d3ee;font-weight:700;">$${data.total.toFixed(2)}</span></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${trackingHtml}

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;">
      <tr>
        <td align="center">
          <a href="${data.storeUrl}/orders" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#ffffff;font-size:15px;font-weight:700;border-radius:12px;text-decoration:none;">
            View Order Details
          </a>
        </td>
      </tr>
    </table>
  `;

  const subjectMap: Record<string, string> = {
    processing: `Your order is being prepared - #${data.orderId.slice(0, 8).toUpperCase()}`,
    shipped: `Your order has shipped! - #${data.orderId.slice(0, 8).toUpperCase()}`,
    delivered: `Your order was delivered - #${data.orderId.slice(0, 8).toUpperCase()}`,
    cancelled: `Order cancelled - #${data.orderId.slice(0, 8).toUpperCase()}`,
    refunded: `Refund issued - #${data.orderId.slice(0, 8).toUpperCase()}`,
  };

  return {
    subject: subjectMap[data.status] || `Order update - #${data.orderId.slice(0, 8).toUpperCase()}`,
    html: baseLayout(content, config.message),
  };
}


// ═══════════════════════════════════════════════════════════
// ABANDONED CART RECOVERY EMAIL
// ═══════════════════════════════════════════════════════════

export interface AbandonedCartData {
  customerName?: string;
  email: string;
  items: Array<{ name: string; price: number; image_url?: string | null }>;
  total: number;
  cartUrl: string;
  storeUrl: string;
}

export function abandonedCartEmail(data: AbandonedCartData): { subject: string; html: string } {
  const firstName = data.customerName?.split(' ')[0] || 'there';
  const itemCount = data.items.length;

  const itemsPreview = data.items.slice(0, 3).map(item => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td width="48" style="padding-right:14px;">
              <div style="width:48px;height:48px;border-radius:10px;background:${item.image_url ? `url(${item.image_url}) center/cover` : 'linear-gradient(135deg,rgba(255,0,110,0.2),rgba(138,43,226,0.2))'};"></div>
            </td>
            <td style="vertical-align:middle;">
              <span style="font-size:14px;font-weight:600;color:#e2e8f0;">${item.name}</span>
            </td>
            <td align="right" style="vertical-align:middle;">
              <span style="font-size:14px;font-weight:700;color:#e2e8f0;">$${item.price.toFixed(2)}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <span style="font-size:56px;">&#x1F6D2;</span>
    </div>

    <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#ffffff;text-align:center;letter-spacing:-0.5px;">
      You left something behind!
    </h1>
    <p style="margin:0 0 32px;font-size:15px;color:#94a3b8;text-align:center;line-height:1.5;">
      Hey ${firstName}, you have ${itemCount} item${itemCount > 1 ? 's' : ''} waiting in your cart.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${itemsPreview}
    </table>

    ${data.items.length > 3 ? `<p style="margin:12px 0 0;font-size:13px;color:#64748b;text-align:center;">+ ${data.items.length - 3} more item${data.items.length - 3 > 1 ? 's' : ''}</p>` : ''}

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;">
      <tr>
        <td colspan="2" style="padding:12px 0;"><div style="height:1px;background:rgba(255,255,255,0.08);"></div></td>
      </tr>
      <tr>
        <td style="font-size:16px;font-weight:700;color:#ffffff;padding:8px 0;">Cart Total</td>
        <td align="right" style="font-size:20px;font-weight:800;color:#22d3ee;padding:8px 0;">$${data.total.toFixed(2)}</td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;">
      <tr>
        <td align="center">
          <a href="${data.cartUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#FF006E,#8A2BE2);color:#ffffff;font-size:16px;font-weight:700;border-radius:12px;text-decoration:none;">
            Complete Your Order
          </a>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-top:14px;">
          <span style="font-size:12px;color:#475569;">Your cart is saved and waiting for you</span>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: `${firstName}, you left ${itemCount} item${itemCount > 1 ? 's' : ''} in your cart`,
    html: baseLayout(content, `Complete your purchase - $${data.total.toFixed(2)} waiting in your cart`),
  };
}


// ═══════════════════════════════════════════════════════════
// WELCOME / FIRST PURCHASE EMAIL
// ═══════════════════════════════════════════════════════════

export interface WelcomeEmailData {
  customerName?: string;
  email: string;
  storeUrl: string;
}

export function welcomeEmail(data: WelcomeEmailData): { subject: string; html: string } {
  const firstName = data.customerName?.split(' ')[0] || 'there';

  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <span style="font-size:56px;">&#x1F389;</span>
    </div>

    <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:#ffffff;text-align:center;letter-spacing:-0.5px;">
      Welcome to ${STORE_NAME}!
    </h1>
    <p style="margin:0 0 32px;font-size:15px;color:#94a3b8;text-align:center;line-height:1.6;">
      Hey ${firstName}, thanks for being a customer! We're thrilled to have you. Here's what you can expect:
    </p>

    <!-- Feature cards -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:14px 18px;background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.12);border-radius:12px;margin-bottom:12px;">
          <span style="font-size:22px;">&#x26A1;</span>
          <span style="font-size:14px;font-weight:600;color:#e2e8f0;margin-left:10px;">Premium Digital Products</span>
          <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">Curated collection of high-quality digital goods, templates, and courses.</p>
        </td>
      </tr>
      <tr><td style="height:12px;"></td></tr>
      <tr>
        <td style="padding:14px 18px;background:rgba(34,211,238,0.06);border:1px solid rgba(34,211,238,0.12);border-radius:12px;">
          <span style="font-size:22px;">&#x1F512;</span>
          <span style="font-size:14px;font-weight:600;color:#e2e8f0;margin-left:10px;">Secure Checkout</span>
          <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">All payments are processed securely through Stripe with bank-level encryption.</p>
        </td>
      </tr>
      <tr><td style="height:12px;"></td></tr>
      <tr>
        <td style="padding:14px 18px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.12);border-radius:12px;">
          <span style="font-size:22px;">&#x1F4AC;</span>
          <span style="font-size:14px;font-weight:600;color:#e2e8f0;margin-left:10px;">AI-Powered Support</span>
          <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">Get instant help finding the perfect products with our AI assistant.</p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:32px;">
      <tr>
        <td align="center">
          <a href="${data.storeUrl}/shop" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#FF006E,#8A2BE2);color:#ffffff;font-size:15px;font-weight:700;border-radius:12px;text-decoration:none;">
            Start Shopping
          </a>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: `Welcome to ${STORE_NAME}!`,
    html: baseLayout(content, `Welcome to ${STORE_NAME}! Discover premium digital products.`),
  };
}
