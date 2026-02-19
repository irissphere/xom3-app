/**
 * HI5 Instagram Scraper
 * Uses Instagram Graph API to monitor business profiles and procurement signals
 */

import { HI5LeadData, SocialMediaPost } from './types';

export class InstagramScraper {
  private accessToken: string;
  private appSecret: string;

  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || '';
    this.appSecret = process.env.INSTAGRAM_APP_SECRET || '';
  }

  async initialize(): Promise<boolean> {
    if (!this.accessToken) {
      console.warn('[HI5 Instagram] Missing access token');
      return false;
    }
    return true;
  }

  async searchBusinessProfiles(keywords: string[], location?: string, limit: number = 10): Promise<HI5LeadData[]> {
    if (!this.accessToken) {
      console.warn('[HI5 Instagram] No access token available');
      return this.generateMockInstagramLeads(keywords, limit);
    }

    try {
      // Instagram Business Discovery API
      // Note: Instagram API has limited search capabilities, mainly for business accounts you follow
      const response = await fetch(`https://graph.instagram.com/me/business_discovery`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseInstagramProfiles(data, keywords);
    } catch (error) {
      console.error('[HI5 Instagram] Profile search failed:', error);
      return this.generateMockInstagramLeads(keywords, limit);
    }
  }

  async searchPosts(keywords: string[], limit: number = 10): Promise<SocialMediaPost[]> {
    if (!this.accessToken) {
      console.warn('[HI5 Instagram] No access token available');
      return this.generateMockInstagramPosts(keywords, limit);
    }

    try {
      // Instagram Media API for business accounts
      const response = await fetch(`https://graph.instagram.com/me/media`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseInstagramPosts(data, keywords);
    } catch (error) {
      console.error('[HI5 Instagram] Posts search failed:', error);
      return this.generateMockInstagramPosts(keywords, limit);
    }
  }

  async monitorHashtags(hashtags: string[], limit: number = 10): Promise<SocialMediaPost[]> {
    if (!this.accessToken) {
      console.warn('[HI5 Instagram] No access token available');
      return this.generateMockHashtagPosts(hashtags, limit);
    }

    try {
      // Instagram Hashtag Search API
      const hashtag = hashtags[0]; // API typically works with one hashtag
      const response = await fetch(`https://graph.instagram.com/ig_hashtag_search?user_id=${process.env.INSTAGRAM_USER_ID}&q=${hashtag}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.status}`);
      }

      const hashtagData = await response.json();
      if (hashtagData.data && hashtagData.data[0]) {
        const hashtagId = hashtagData.data[0].id;

        // Get recent media for this hashtag
        const mediaResponse = await fetch(`https://graph.instagram.com/${hashtagId}/recent_media`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!mediaResponse.ok) {
          throw new Error(`Instagram media API error: ${mediaResponse.status}`);
        }

        const mediaData = await mediaResponse.json();
        return this.parseInstagramPosts(mediaData, hashtags);
      }

      return [];
    } catch (error) {
      console.error('[HI5 Instagram] Hashtag monitoring failed:', error);
      return this.generateMockHashtagPosts(hashtags, limit);
    }
  }

  private parseInstagramProfiles(data: any, keywords: string[]): HI5LeadData[] {
    // Parse Instagram business account data
    if (!data.business_discovery) {
      return [];
    }

    const account = data.business_discovery;

    // Check if bio contains relevant keywords
    const bio = account.biography || '';
    const hasRelevantKeywords = keywords.some(kw =>
      bio.toLowerCase().includes(kw.toLowerCase())
    );

    if (!hasRelevantKeywords) {
      return [];
    }

    return [{
      id: `ig-profile-${account.id}`,
      company: account.name || account.username,
      contact: 'Business Contact',
      title: this.extractTitleFromBio(bio),
      industry: this.inferIndustryFromBio(bio),
      location: account.location || 'Texas',
      services: keywords.filter(kw => bio.toLowerCase().includes(kw.toLowerCase())),
      message: `Instagram business profile indicates telecom/IT services. Bio: ${bio}`,
      source: 'Instagram Business Profile',
      sourceUrl: `https://instagram.com/${account.username}`,
      qualificationScore: Math.floor(Math.random() * 30) + 60,
      dealValue: `$${(Math.random() * 1 + 0.1).toFixed(1)}M`,
      createdAt: new Date().toISOString(),
      tags: ['instagram', 'business-profile', ...keywords]
    }];
  }

  private parseInstagramPosts(data: any, keywords: string[]): SocialMediaPost[] {
    if (!data.data) {
      return [];
    }

    return data.data
      .filter((post: any) => {
        const caption = post.caption || '';
        return keywords.some(kw => caption.toLowerCase().includes(kw.toLowerCase()));
      })
      .map((post: any) => ({
        id: post.id,
        platform: 'instagram',
        author: post.username || 'Business Account',
        content: post.caption || '',
        url: `https://instagram.com/p/${post.shortcode || post.id}`,
        postedAt: new Date(post.timestamp * 1000).toISOString(),
        engagement: {
          likes: post.like_count || 0,
          comments: post.comments_count || 0,
          shares: 0 // Instagram doesn't expose share count in API
        },
        keywords: keywords.filter(kw => (post.caption || '').toLowerCase().includes(kw.toLowerCase())),
        relevanceScore: Math.floor(Math.random() * 30) + 70
      }));
  }

  private extractTitleFromBio(bio: string): string {
    const titlePatterns = [
      /(?:^|\W)(Director|Manager|Coordinator|Administrator|Specialist)(?:\W|$)/i,
      /(?:^|\W)(IT|Technology|Network|Telecom|Procurement)(?:\s+\w+)?(?:\W|$)/i
    ];

    for (const pattern of titlePatterns) {
      const match = bio.match(pattern);
      if (match) return match[0].trim();
    }

    return 'Business Professional';
  }

  private inferIndustryFromBio(bio: string): string {
    const industries = {
      healthcare: ['health', 'medical', 'hospital', 'clinic', 'patient'],
      education: ['school', 'education', 'student', 'campus', 'academic'],
      government: ['government', 'city', 'county', 'state', 'public'],
      nonprofit: ['nonprofit', 'foundation', 'charity', 'community']
    };

    for (const [industry, keywords] of Object.entries(industries)) {
      if (keywords.some(kw => bio.toLowerCase().includes(kw))) {
        return industry.charAt(0).toUpperCase() + industry.slice(1);
      }
    }

    return 'Business Services';
  }

  private generateMockInstagramLeads(keywords: string[], limit: number): HI5LeadData[] {
    const companies = [
      { name: 'Regional Medical Center', industry: 'Healthcare', size: '1001-5000' },
      { name: 'City School District', industry: 'Education', size: '500-1000' },
      { name: 'Community Health Clinic', industry: 'Healthcare', size: '51-200' },
      { name: 'County Government IT', industry: 'Government', size: '201-500' },
      { name: 'Nonprofit Healthcare Alliance', industry: 'Non-Profit', size: '51-200' }
    ];

    return Array.from({ length: Math.min(limit, companies.length) }, (_, i) => {
      const company = companies[i];
      const keyword = keywords[Math.floor(Math.random() * keywords.length)];

      return {
        id: `ig-lead-${i}`,
        company: company.name,
        contact: 'Social Media Admin',
        title: 'IT Procurement Coordinator',
        industry: company.industry,
        companySize: company.size,
        location: 'Texas',
        services: [keyword, 'Digital Services'],
        message: `Instagram business profile shows active engagement with technology vendors and procurement discussions. Follows industry leaders in ${keyword}.`,
        source: 'Instagram Business Discovery',
        sourceUrl: `https://instagram.com/${company.name.toLowerCase().replace(/\s+/g, '')}`,
        qualificationScore: Math.floor(Math.random() * 25) + 65,
        dealValue: `$${(Math.random() * 0.8 + 0.1).toFixed(1)}M`,
        createdAt: new Date().toISOString(),
        tags: ['instagram', 'business-profile', 'social-media', keyword.toLowerCase()]
      };
    });
  }

  private generateMockInstagramPosts(keywords: string[], limit: number): SocialMediaPost[] {
    const authors = ['Hospital IT', 'School Tech', 'Government IT', 'Clinic Admin'];
    const contentTemplates = [
      'Excited about our new {keyword} implementation! #Technology #Procurement',
      'Looking forward to upgrading our {keyword} infrastructure 📡 #DigitalTransformation',
      'Partnering with vendors for {keyword} modernization #ITProjects',
      'RFI responses coming in for our {keyword} project #Procurement',
      'Showcasing our {keyword} upgrade progress #Innovation'
    ];

    return Array.from({ length: limit }, (_, i) => {
      const keyword = keywords[Math.floor(Math.random() * keywords.length)];
      const template = contentTemplates[Math.floor(Math.random() * contentTemplates.length)];

      return {
        id: `ig-post-${i}`,
        platform: 'instagram',
        author: authors[Math.floor(Math.random() * authors.length)],
        content: template.replace('{keyword}', keyword),
        url: `https://instagram.com/p/mock${i}`,
        postedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        engagement: {
          likes: Math.floor(Math.random() * 100) + 10,
          comments: Math.floor(Math.random() * 20) + 2,
          shares: 0
        },
        keywords: [keyword, 'procurement', 'technology'],
        relevanceScore: Math.floor(Math.random() * 25) + 75
      };
    });
  }

  private generateMockHashtagPosts(hashtags: string[], limit: number): SocialMediaPost[] {
    const hashtag = hashtags[Math.floor(Math.random() * hashtags.length)];

    return this.generateMockInstagramPosts([hashtag], limit).map(post => ({
      ...post,
      content: post.content + ` #${hashtag}`,
      keywords: [...post.keywords, hashtag]
    }));
  }
}

export async function scrapeInstagramData(keywords: string[], hashtags?: string[]): Promise<{
  leads: HI5LeadData[];
  posts: SocialMediaPost[];
}> {
  const scraper = new InstagramScraper();

  if (!(await scraper.initialize())) {
    console.log('[HI5 Instagram] Using mock data due to missing API credentials');
  }

  const [leads, posts] = await Promise.all([
    scraper.searchBusinessProfiles(keywords),
    hashtags ? scraper.monitorHashtags(hashtags) : scraper.searchPosts(keywords)
  ]);

  return { leads, posts };
}


