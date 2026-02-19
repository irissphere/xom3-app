#!/usr/bin/env tsx
/**
 * Stripe Setup Verification Script
 * 
 * Verifies that all required Stripe environment variables are set correctly
 * for the Obols promotional system.
 * 
 * Run: npx tsx scripts/verify-stripe-setup.ts
 */

const required = {
  STRIPE_SECRET_KEY: {
    pattern: /^sk_(test|live)_[A-Za-z0-9]+$/,
    description: "Stripe Secret API Key",
    required: true,
  },
  STRIPE_PUBLISHABLE_KEY: {
    pattern: /^pk_(test|live)_[A-Za-z0-9]+$/,
    description: "Stripe Publishable API Key",
    required: false, // Optional but recommended
  },
  STRIPE_WEBHOOK_SECRET: {
    pattern: /^whsec_[A-Za-z0-9]+$/,
    description: "Stripe Webhook Signing Secret",
    required: true,
  },
  STRIPE_PRICE_XOM3: {
    pattern: /^price_[A-Za-z0-9]+$/,
    description: "Stripe Price ID for XOM3 subscription",
    required: true,
  },
  STRIPE_PRICE_HEALTHCARE: {
    pattern: /^price_[A-Za-z0-9]+$/,
    description: "Stripe Price ID for Healthcare subscription",
    required: false, // Only if using healthcare tier
  },
} as const;

type RequiredConfig = (typeof required)[keyof typeof required];

function verifyEnvVar(key: string, config: RequiredConfig): { ok: boolean; message: string } {
  const value = process.env[key];

  if (!value) {
    if (config.required) {
      return { ok: false, message: `[FAIL] Missing required: ${key}` };
    } else {
      return { ok: true, message: `[WARN] Optional missing: ${key} (${config.description})` };
    }
  }

  if (value.includes("your_") || value.includes("example") || value.includes("placeholder")) {
    return { ok: false, message: `[FAIL] ${key} contains placeholder value: ${value.slice(0, 20)}...` };
  }

  if (!config.pattern.test(value)) {
    return {
      ok: false,
      message: `[FAIL] ${key} format invalid (expected pattern: ${config.pattern.source.slice(1, -1)})`,
    };
  }

  return { ok: true, message: `[OK] ${key}: ${value.slice(0, 20)}...` };
}

function checkModeConsistency() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  if (!secretKey || !publishableKey) {
    return { ok: true, message: "[WARN] Cannot check mode consistency (keys missing)" };
  }

  const secretMode = secretKey.startsWith("sk_test_") ? "test" : secretKey.startsWith("sk_live_") ? "live" : null;
  const publishableMode = publishableKey.startsWith("pk_test_") ? "test" : publishableKey.startsWith("pk_live_") ? "live" : null;

  if (secretMode && publishableMode && secretMode !== publishableMode) {
    return {
      ok: false,
      message: `[FAIL] Mode mismatch: Secret key is ${secretMode}, Publishable key is ${publishableMode}`,
    };
  }

  return {
    ok: true,
    message: `[OK] Mode consistency: Both keys are in ${secretMode || "unknown"} mode`,
  };
}

function main() {
  console.log("\nStripe Setup Verification for Obols Promo\n");
  console.log("=" .repeat(60));

  let allOk = true;
  const results: Array<{ ok: boolean; message: string }> = [];

  // Check each required variable
  for (const [key, config] of Object.entries(required)) {
    const result = verifyEnvVar(key, config);
    results.push(result);
    if (!result.ok) allOk = false;
    console.log(result.message);
  }

  // Check mode consistency
  const modeCheck = checkModeConsistency();
  results.push(modeCheck);
  if (!modeCheck.ok) allOk = false;
  console.log(modeCheck.message);

  // Summary
  console.log("=" .repeat(60));
  if (allOk) {
    console.log("\nAll checks passed. Stripe configuration looks good.\n");
    console.log("Next steps:");
    console.log("1. Verify webhook endpoint is configured in Stripe Dashboard");
    console.log("2. Test checkout flow to ensure trial enrollment works");
    console.log("3. Check webhook events are being received\n");
  } else {
    console.log("\nSome checks failed. Please fix the issues above.\n");
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { verifyEnvVar, checkModeConsistency };
