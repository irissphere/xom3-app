/**
 * XOM3 Content Type Definitions
 * ==============================
 * Type-safe interfaces for all page content, components, and copy blocks.
 */

// ============================================================
// CORE TYPES
// ============================================================

export interface CTAButton {
  label: string;
  href?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export interface ContentSection {
  title: string;
  body: string;
}

export interface Feature {
  title: string;
  body: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio';
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

// ============================================================
// LANE TYPES
// ============================================================

export type LaneId = "benefits-crm" | "automation" | "social";

export interface LaneOverview {
  id: LaneId;
  title: string;
  body: string;
  cta: string;
  href: string;
}

export interface LaneLanding {
  id: LaneId;
  name: string;
  description: string;
  icon: string;
}

// ============================================================
// PAGE CONTENT TYPES
// ============================================================

export interface HomepageContent {
  meta: {
    title: string;
    description: string;
  };
  hero: {
    title: string;
    subtitle: string;
    ctaText: string;
    ctaHref: string;
  };
  features: Feature[];
}

// ============================================================
// AUTH PAGE TYPES
// ============================================================

export interface LoginContent {
  title: string;
  subtitle: string;
  fields?: string[];
  ctaPrimary?: string;
  links?: string[];
}

export interface SignUpContent {
  title: string;
  subtitle: string;
  fields?: FormField[];
  laneSelectionTitle?: string;
  lanes?: string[];
  integrationTitle?: string;
  notesTitle?: string;
  notesPlaceholder?: string;
  ctaPrimary?: string;
}

export interface DemoPageContent {
  title: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  ctaPrimary?: string;
}

export interface IntakeFormContent {
  title: string;
  subtitle?: string;
  fields?: FormField[];
  ctaPrimary?: string;
}

export interface OneTimeCodeContent {
  title: string;
  subtitle: string;
  fields?: string[];
  ctaPrimary?: string;
}

export interface LaneRoutingContent {
  title: string;
  subtitle: string;
  dynamicLaneName?: boolean;
  ctaPrimary?: string;
}

// ============================================================
// GUI TEXT TYPES
// ============================================================

export interface GUIText {
  common: {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    close: string;
  };
  navigation: {
    home: string;
    dashboard: string;
    settings: string;
    logout: string;
  };
}

// ============================================================
// TRIAL ONBOARDING TYPES
// ============================================================

export interface TrialOnboardingContent {
  title: string;
  subtitle?: string;
  steps?: string[];
  ctaPrimary?: string;
}

// ============================================================
// MASTER CONTENT TYPE
// ============================================================

export interface Xom3Content {
  homepage: HomepageContent;
  login: LoginContent;
  signUp: SignUpContent;
  demo: DemoPageContent;
  intake: IntakeFormContent;
  oneTimeCode: OneTimeCodeContent;
  laneRouting: LaneRoutingContent;
  lanes: Record<LaneId, LaneLanding>;
  gui: GUIText;
  trialOnboarding: TrialOnboardingContent;
}
