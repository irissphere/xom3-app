/**
 * XOM3 Content Index
 * ==================
 * Central export for all content files with type safety.
 */

import type {
  Xom3Content,
  HomepageContent,
  LoginContent,
  SignUpContent,
  DemoPageContent,
  IntakeFormContent,
  OneTimeCodeContent,
  LaneRoutingContent,
  TrialOnboardingContent,
  LaneLanding,
  LaneId,
  GUIText,
} from './types';

// Import JSON content
import homepageJson from './homepage.json';
import authJson from './auth.json';
import lanesJson from './lanes.json';
import guiJson from './gui.json';

// Type-cast imports
export const homepageContent = homepageJson as HomepageContent;
export const loginContent = authJson.login as LoginContent;
export const signUpContent = authJson.signUp as SignUpContent;
export const demoContent = authJson.demo as DemoPageContent;
export const intakeContent = authJson.intake as IntakeFormContent;
export const oneTimeCodeContent = authJson.oneTimeCode as OneTimeCodeContent;
export const laneRoutingContent = authJson.laneRouting as LaneRoutingContent;
export const trialOnboardingContent = authJson.trialOnboarding as TrialOnboardingContent;
export const lanesContent = lanesJson as Record<LaneId, LaneLanding>;
export const guiContent = guiJson as GUIText;

// Helper to get lane by ID
export function getLane(id: LaneId): LaneLanding {
  return lanesContent[id];
}

// Helper to get all lanes as array
export function getAllLanes(): LaneLanding[] {
  return Object.values(lanesContent);
}

// Master content export
export const xom3Content: Xom3Content = {
  homepage: homepageContent,
  login: loginContent,
  signUp: signUpContent,
  demo: demoContent,
  intake: intakeContent,
  oneTimeCode: oneTimeCodeContent,
  laneRouting: laneRoutingContent,
  lanes: lanesContent,
  gui: guiContent,
  trialOnboarding: trialOnboardingContent,
};

export default xom3Content;

// Re-export types
export * from './types';
