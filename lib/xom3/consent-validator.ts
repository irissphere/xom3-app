import { ConsentProfile, ConsentCategory } from './types';
import ConsentManager from './consent-manager';

export async function validateConsent(
  visitorId: string,
  domain: string,
  requiredCategories: string[] = []
): Promise<{
  valid: boolean;
  profile?: ConsentProfile;
  missingCategories?: string[];
}> {
  const manager = ConsentManager.getInstance();
  const profile = manager.getProfile(visitorId);

  if (!profile) {
    return {
      valid: false,
      missingCategories: requiredCategories
    };
  }

  if (!profile.consentGiven) {
    return {
      valid: false,
      profile,
      missingCategories: requiredCategories
    };
  }

  const missingCategories = requiredCategories.filter(catId =>
    !profile.consentCategories.find(cat => cat.id === catId)?.granted
  );

  return {
    valid: missingCategories.length === 0,
    profile,
    missingCategories: missingCategories.length > 0 ? missingCategories : undefined
  };
}

export async function getConsentProfile(visitorId: string): Promise<ConsentProfile | null> {
  const manager = ConsentManager.getInstance();
  return manager.getProfile(visitorId);
}

export function detectJurisdiction(): string {
  // Simple jurisdiction detection - expand based on your needs
  // This is a basic implementation
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (timezone.includes('Europe')) return 'EU';
  if (timezone.includes('America/New_York') || timezone.includes('America/Los_Angeles')) return 'US';
  if (timezone.includes('Asia')) return 'APAC';

  return 'UNKNOWN';
}

export function getJurisdictionRequirements(jurisdiction: string): {
  strictConsent: boolean;
  dataRetentionDays: number;
  requiredCategories: string[];
} {
  switch (jurisdiction) {
    case 'EU':
      return {
        strictConsent: true,
        dataRetentionDays: 365,
        requiredCategories: ['essential']
      };
    case 'US':
      return {
        strictConsent: false, // Varies by state
        dataRetentionDays: 730,
        requiredCategories: ['essential']
      };
    default:
      return {
        strictConsent: false,
        dataRetentionDays: 365,
        requiredCategories: ['essential']
      };
  }
}








