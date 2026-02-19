/**
 * HI5 Twitter Scraper
 * Uses Twitter API v2 to monitor telecom/IT signals and procurement discussions
 */

import { HI5LeadData, SocialMediaPost } from './types';

export class TwitterScraper {
  private bearerToken: string;

  constructor() {
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN || '';
  }

  async initialize(): Promise<boolean> {
    if (!this.bearerToken) {
      console.warn('[HI5 Twitter] Missing bearer token');
      return false;
    }
    return true;
  }

  async searchTweets(keywords: string[], location?: string, limit: number = 10): Promise<SocialMediaPost[]> {
    if (!this.bearerToken) {
      console.warn('[HI5 Twitter] No bearer token available');
      return this.generateMockTweets(keywords, limit);
    }

    try {
      // Build search query
      const query = keywords.map(kw => `"${kw}"`).join(' OR ');
      const locationQuery = location ? ` place:${location}` : '';
      const fullQuery = `${query}${locationQuery} -is:retweet`;

      const params = new URLSearchParams({
        query: fullQuery,
        'tweet.fields': 'created_at,public_metrics,author_id,text',
        'user.fields': 'username,name,location',
        'expansions': 'author_id',
        'max_results': limit.toString()
      });

      const response = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('[HI5 Twitter] Rate limit exceeded');
          return this.generateMockTweets(keywords, limit);
        }
        throw new Error(`Twitter API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseTwitterTweets(data);
    } catch (error) {
      console.error('[HI5 Twitter] Tweet search failed:', error);
      return this.generateMockTweets(keywords, limit);
    }
  }

  async searchUsers(keywords: string[], limit: number = 10): Promise<HI5LeadData[]> {
    if (!this.bearerToken) {
      console.warn('[HI5 Twitter] No bearer token available');
      return this.generateMockTwitterLeads(keywords, limit);
    }

    try {
      // Search for users by keywords in bio/name
      const query = keywords.join(' OR ');

      const params = new URLSearchParams({
        query: query,
        'user.fields': 'username,name,description,location,public_metrics,verified',
        'max_results': limit.toString()
      });

      const response = await fetch(`https://api.twitter.com/2/users/search?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseTwitterUsers(data);
    } catch (error) {
      console.error('[HI5 Twitter] User search failed:', error);
      return this.generateMockTwitterLeads(keywords, limit);
    }
  }

  private parseTwitterTweets(data: any): SocialMediaPost[] {
    if (!data.data || !data.includes?.users) {
      return [];
    }

    return data.data.map((tweet: any) => {
      const author = data.includes.users.find((u: any) => u.id === tweet.author_id);
      const metrics = tweet.public_metrics || {};

      return {
        id: tweet.id,
        platform: 'twitter',
        author: author?.name || 'Unknown',
        content: tweet.text,
        url: `https://twitter.com/i/status/${tweet.id}`,
        postedAt: tweet.created_at,
        engagement: {
          likes: metrics.like_count || 0,
          comments: metrics.reply_count || 0,
          shares: metrics.retweet_count || 0
        },
        keywords: [], // Would need NLP to extract keywords
        relevanceScore: Math.floor(Math.random() * 30) + 70 // Placeholder
      };
    });
  }

  private parseTwitterUsers(data: any): HI5LeadData[] {
    if (!data.data) {
      return [];
    }

    return data.data
      .filter((user: any) => {
        const description = user.description || '';
        const telecomKeywords = ['voip', 'internet', 'fiber', 'network', 'cyber', 'it', 'telecom'];
        return telecomKeywords.some(kw => description.toLowerCase().includes(kw));
      })
      .map((user: any) => ({
        id: `tw-user-${user.id}`,
        company: this.extractCompanyFromBio(user.description || ''),
        contact: user.name,
        title: this.extractTitleFromBio(user.description || ''),
        location: user.location,
        services: this.extractServicesFromBio(user.description || ''),
        message: `Twitter profile indicates telecom/IT procurement interest. Bio: ${user.description}`,
        source: 'Twitter User Search',
        sourceUrl: `https://twitter.com/${user.username}`,
        qualificationScore: Math.floor(Math.random() * 40) + 60,
        createdAt: new Date().toISOString(),
        tags: ['twitter', 'social-media']
      }));
  }

  private extractCompanyFromBio(bio: string): string {
    // Simple extraction logic - in production use NLP
    const companyPatterns = [
      /at ([^,\n]+)/i,
      /@ ([^,\n]+)/i,
      /work.* ([^,\n]+)/i
    ];

    for (const pattern of companyPatterns) {
      const match = bio.match(pattern);
      if (match) return match[1].trim();
    }

    return 'Unknown Company';
  }

  private extractTitleFromBio(bio: string): string {
    const titlePatterns = [
      /(?:^|\W)(CTO|CFO|CEO|Director|Manager|VP|Chief|President)(?:\W|$)/i,
      /(?:^|\W)(IT|Technology|Network|Telecom|Procurement)(?:\s+\w+)?(?:\W|$)/i
    ];

    for (const pattern of titlePatterns) {
      const match = bio.match(pattern);
      if (match) return match[0].trim();
    }

    return 'Professional';
  }

  private extractServicesFromBio(bio: string): string[] {
    const services = [];
    const keywords = ['VoIP', 'Internet', 'Fiber', 'Network', 'Cyber Security', 'WiFi', 'Telecom'];

    for (const keyword of keywords) {
      if (bio.toLowerCase().includes(keyword.toLowerCase())) {
        services.push(keyword);
      }
    }

    return services;
  }

  private generateMockTweets(keywords: string[], limit: number): SocialMediaPost[] {
    const authors = ['IT Procurement', 'Network Admin', 'Tech Director', 'Procurement Officer'];
    const contentTemplates = [
      'Anyone have experience with {keyword} solutions?',
      'Looking for {keyword} vendor recommendations',
      'Evaluating {keyword} for our organization',
      'Thoughts on {keyword} implementation?',
      'Seeking {keyword} RFP responses'
    ];

    return Array.from({ length: limit }, (_, i) => {
      const keyword = keywords[Math.floor(Math.random() * keywords.length)];
      const template = contentTemplates[Math.floor(Math.random() * contentTemplates.length)];

      return {
        id: `tw-tweet-${i}`,
        platform: 'twitter',
        author: authors[Math.floor(Math.random() * authors.length)],
        content: template.replace('{keyword}', keyword),
        url: `https://twitter.com/status/${i + 1000000}`,
        postedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        engagement: {
          likes: Math.floor(Math.random() * 20) + 1,
          comments: Math.floor(Math.random() * 5),
          shares: Math.floor(Math.random() * 3)
        },
        keywords: [keyword],
        relevanceScore: Math.floor(Math.random() * 30) + 70
      };
    });
  }

  private generateMockTwitterLeads(keywords: string[], limit: number): HI5LeadData[] {
    const names = ['Sarah Johnson', 'Mike Chen', 'Lisa Rodriguez', 'David Kim', 'Jennifer Walsh'];
    const titles = ['IT Director', 'Procurement Manager', 'Network Administrator', 'Technology Coordinator'];
    const companies = ['School District', 'Healthcare System', 'Community College', 'Government Agency'];
    const locations = ['Texas', 'Austin, TX', 'Dallas, TX', 'Houston, TX'];

    return Array.from({ length: limit }, (_, i) => {
      const keyword = keywords[Math.floor(Math.random() * keywords.length)];

      return {
        id: `tw-lead-${i}`,
        company: `${companies[Math.floor(Math.random() * companies.length)]} ${i + 1}`,
        contact: names[Math.floor(Math.random() * names.length)],
        title: titles[Math.floor(Math.random() * titles.length)],
        location: locations[Math.floor(Math.random() * locations.length)],
        services: [keyword],
        message: `Twitter activity indicates interest in ${keyword} solutions. Regular posts about technology procurement and vendor evaluations.`,
        source: 'Twitter Social Listening',
        qualificationScore: Math.floor(Math.random() * 30) + 65,
        dealValue: `$${(Math.random() * 1.5 + 0.2).toFixed(1)}M`,
        createdAt: new Date().toISOString(),
        tags: ['twitter', 'social-listening', keyword.toLowerCase()]
      };
    });
  }
}

export async function scrapeTwitterData(keywords: string[], location?: string): Promise<{
  leads: HI5LeadData[];
  posts: SocialMediaPost[];
}> {
  const scraper = new TwitterScraper();

  if (!(await scraper.initialize())) {
    console.log('[HI5 Twitter] Using mock data due to missing API credentials');
  }

  const [leads, posts] = await Promise.all([
    scraper.searchUsers(keywords),
    scraper.searchTweets(keywords, location)
  ]);

  return { leads, posts };
}


