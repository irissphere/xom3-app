export type Hi5Plan = "core" | "pro" | "custom" | "trial";

export type Hi5Features = {
  leadIntake: boolean;
  vendorRFQ: boolean;
  responsePositioning: boolean;
  scrapers: {
    linkedin: boolean;
    twitter: boolean;
    instagram: boolean;
  };
};

function parseBool(v: string | undefined): boolean | undefined {
  if (v == null) return undefined;
  const s = v.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return undefined;
}

function baseFeaturesForPlan(plan: Hi5Plan): Hi5Features {
  switch (plan) {
    case "pro":
      return {
        leadIntake: true,
        vendorRFQ: true,
        responsePositioning: true,
        scrapers: { linkedin: true, twitter: true, instagram: true },
      };
    case "custom":
      // Custom defaults to "everything on"; override via env vars below.
      return {
        leadIntake: true,
        vendorRFQ: true,
        responsePositioning: true,
        scrapers: { linkedin: true, twitter: true, instagram: true },
      };
    case "trial":
      return {
        leadIntake: true,
        vendorRFQ: false,
        responsePositioning: false,
        scrapers: { linkedin: true, twitter: false, instagram: false },
      };
    case "core":
    default:
      return {
        leadIntake: true,
        vendorRFQ: true,
        responsePositioning: false,
        scrapers: { linkedin: true, twitter: true, instagram: false },
      };
  }
}

export function getHi5SubscriptionConfig(): { plan: Hi5Plan; features: Hi5Features } {
  const rawPlan = (process.env.HI5_PLAN || "core").toLowerCase();
  const plan: Hi5Plan =
    rawPlan === "pro" || rawPlan === "custom" || rawPlan === "trial" || rawPlan === "core"
      ? (rawPlan as Hi5Plan)
      : "core";

  const base = baseFeaturesForPlan(plan);

  // Optional overrides (for precise client-level gating; later: Airtable).
  const leadIntake = parseBool(process.env.HI5_FEATURE_LEAD_INTAKE);
  const vendorRFQ = parseBool(process.env.HI5_FEATURE_VENDOR_RFQ);
  const responsePositioning = parseBool(process.env.HI5_FEATURE_RESPONSE_POSITIONING);
  const linkedin = parseBool(process.env.HI5_SCRAPER_LINKEDIN);
  const twitter = parseBool(process.env.HI5_SCRAPER_TWITTER);
  const instagram = parseBool(process.env.HI5_SCRAPER_INSTAGRAM);

  return {
    plan,
    features: {
      leadIntake: leadIntake ?? base.leadIntake,
      vendorRFQ: vendorRFQ ?? base.vendorRFQ,
      responsePositioning: responsePositioning ?? base.responsePositioning,
      scrapers: {
        linkedin: linkedin ?? base.scrapers.linkedin,
        twitter: twitter ?? base.scrapers.twitter,
        instagram: instagram ?? base.scrapers.instagram,
      },
    },
  };
}
