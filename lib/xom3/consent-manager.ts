import { ConsentProfile, ConsentCategory, DataRetentionPolicy } from './types';

class ConsentManager {
  private static instance: ConsentManager;
  private profiles: Map<string, ConsentProfile> = new Map();

  static getInstance(): ConsentManager {
    if (!ConsentManager.instance) {
      ConsentManager.instance = new ConsentManager();
    }
    return ConsentManager.instance;
  }

  // Create or update consent profile
  async updateProfile(profileId: string, updates: Partial<ConsentProfile>): Promise<ConsentProfile> {
    const existing = this.profiles.get(profileId);
    const profile: ConsentProfile = {
      ...existing,
      ...updates,
      id: profileId,
      lastUpdated: new Date(),
      expiresAt: updates.dataRetention ? this.calculateExpiry(updates.dataRetention) : existing?.expiresAt
    } as ConsentProfile;

    this.profiles.set(profileId, profile);
    await this.persistProfile(profile);

    return profile;
  }

  // Get consent profile
  getProfile(profileId: string): ConsentProfile | null {
    return this.profiles.get(profileId) || null;
  }

  // Check if consent is valid for specific categories
  hasConsent(profileId: string, categories: string[]): boolean {
    const profile = this.getProfile(profileId);
    if (!profile || !profile.consentGiven) return false;

    // Check if all required categories are granted
    return categories.every(catId =>
      profile.consentCategories.find(cat => cat.id === catId)?.granted
    );
  }

  // Revoke consent
  async revokeConsent(profileId: string): Promise<void> {
    const profile = this.profiles.get(profileId);
    if (profile) {
      profile.consentGiven = false;
      profile.consentCategories.forEach(cat => cat.granted = false);
      profile.lastUpdated = new Date();
      await this.persistProfile(profile);
    }
  }

  // Get default consent categories
  getDefaultCategories(): ConsentCategory[] {
    return [
      {
        id: 'essential',
        name: 'Essential Cookies',
        description: 'Required for website functionality',
        required: true,
        granted: true,
        purpose: 'Website operation'
      },
      {
        id: 'analytics',
        name: 'Analytics',
        description: 'Track website usage and performance',
        required: false,
        granted: false,
        purpose: 'Improve user experience'
      },
      {
        id: 'marketing',
        name: 'Marketing',
        description: 'Personalized ads and content',
        required: false,
        granted: false,
        purpose: 'Targeted advertising'
      },
      {
        id: 'functional',
        name: 'Functional',
        description: 'Remember preferences and settings',
        required: false,
        granted: false,
        purpose: 'Enhanced functionality'
      }
    ];
  }

  // Calculate data expiry based on retention policy
  private calculateExpiry(policy: DataRetentionPolicy): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + policy.duration);
    return expiry;
  }

  // Persist profile to storage (implement based on your storage layer)
  private async persistProfile(profile: ConsentProfile): Promise<void> {
    // Implementation depends on your storage (Airtable, Supabase, etc.)
    // For now, this is a placeholder
    console.log('Persisting consent profile:', profile.id);
  }

  // Clean up expired profiles
  async cleanupExpiredProfiles(): Promise<void> {
    const now = new Date();
    const expiredIds: string[] = [];

    this.profiles.forEach((profile, id) => {
      if (profile.expiresAt && profile.expiresAt < now) {
        expiredIds.push(id);
      }
    });

    expiredIds.forEach(id => this.profiles.delete(id));
  }
}

export default ConsentManager;
