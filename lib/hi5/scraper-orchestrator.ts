/**
 * HI5 Scraper Orchestrator
 * Coordinates all data sources and feeds into the HI5 pipeline
 */

import { HI5LeadData, RFPData, SocialMediaPost, ScrapingResult } from './types';
import { scrapeAllRFPBoards } from './rfp-scraper';
import { scrapeLinkedInData } from './linkedin-scraper';
import { scrapeTwitterData } from './twitter-scraper';
import { scrapeInstagramData } from './instagram-scraper';
import { scrapeAllJobBoards } from './job-board-scraper';
import { scrapeAllNewsSources } from './news-scraper';

export interface ScrapingConfig {
  enabledSources: {
    linkedin: boolean;
    twitter: boolean;
    instagram: boolean;
    rfpBoards: boolean;
    jobBoards: boolean;
    newsSources: boolean;
  };
  keywords: string[];
  location?: string;
  hashtags?: string[];
  maxResultsPerSource: number;
  delayBetweenSources: number;
}

export class ScraperOrchestrator {
  private config: ScrapingConfig;

  constructor(config: Partial<ScrapingConfig> = {}) {
    this.config = {
      enabledSources: {
        linkedin: false, // Disabled due to no API access
        twitter: false, // Disabled due to no API access
        instagram: false, // Disabled due to no API access
        rfpBoards: true,
        jobBoards: true,
        newsSources: true,
        ...config.enabledSources
      },
      keywords: [
        'VoIP', 'Internet', 'Fiber', 'Network', 'Cyber Security', 'WiFi',
        'Telecommunications', 'Unified Communications', 'Cloud Services'
      ],
      location: 'Texas',
      hashtags: ['VoIP', 'Telecom', 'NetworkSecurity', 'FiberInternet', 'ITProcurement'],
      maxResultsPerSource: 10,
      delayBetweenSources: 2000,
      ...config
    };
  }

  async runFullScraping(): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    const startTime = new Date().toISOString();

    console.log('[HI5 Orchestrator] Starting comprehensive lead discovery...');

    // Job Board Scraping
    if (this.config.enabledSources.jobBoards) {
      try {
        console.log('[HI5 Orchestrator] Scraping job boards...');
        const jobLeads = await scrapeAllJobBoards();
        results.push({
          platform: 'job-boards',
          leads: jobLeads,
          scrapedAt: new Date().toISOString()
        });
        await this.delay(this.config.delayBetweenSources);
      } catch (error) {
        console.error('[HI5 Orchestrator] Job board scraping failed:', error);
        results.push({
          platform: 'job-boards',
          leads: [],
          scrapedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // News Source Scraping
    if (this.config.enabledSources.newsSources) {
      try {
        console.log('[HI5 Orchestrator] Scraping news sources...');
        const newsLeads = await scrapeAllNewsSources();
        results.push({
          platform: 'news-sources',
          leads: newsLeads,
          scrapedAt: new Date().toISOString()
        });
        await this.delay(this.config.delayBetweenSources);
      } catch (error) {
        console.error('[HI5 Orchestrator] News scraping failed:', error);
        results.push({
          platform: 'news-sources',
          leads: [],
          scrapedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // RFP Board Scraping
    if (this.config.enabledSources.rfpBoards) {
      try {
        console.log('[HI5 Orchestrator] Scraping RFP boards...');
        const rfpData = await scrapeAllRFPBoards();
        results.push({
          platform: 'rfp-boards',
          leads: this.convertRFPsToLeads(rfpData),
          rfps: rfpData,
          scrapedAt: new Date().toISOString()
        });
        await this.delay(this.config.delayBetweenSources);
      } catch (error) {
        console.error('[HI5 Orchestrator] RFP scraping failed:', error);
        results.push({
          platform: 'rfp-boards',
          leads: [],
          rfps: [],
          scrapedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // LinkedIn Scraping
    if (this.config.enabledSources.linkedin) {
      try {
        console.log('[HI5 Orchestrator] Scraping LinkedIn...');
        const linkedinData = await scrapeLinkedInData(
          this.config.keywords,
          this.config.location
        );
        results.push({
          platform: 'linkedin',
          leads: linkedinData.leads,
          posts: linkedinData.posts,
          scrapedAt: new Date().toISOString()
        });
        await this.delay(this.config.delayBetweenSources);
      } catch (error) {
        console.error('[HI5 Orchestrator] LinkedIn scraping failed:', error);
        results.push({
          platform: 'linkedin',
          leads: [],
          posts: [],
          scrapedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Twitter Scraping
    if (this.config.enabledSources.twitter) {
      try {
        console.log('[HI5 Orchestrator] Scraping Twitter...');
        const twitterData = await scrapeTwitterData(
          this.config.keywords,
          this.config.location
        );
        results.push({
          platform: 'twitter',
          leads: twitterData.leads,
          posts: twitterData.posts,
          scrapedAt: new Date().toISOString()
        });
        await this.delay(this.config.delayBetweenSources);
      } catch (error) {
        console.error('[HI5 Orchestrator] Twitter scraping failed:', error);
        results.push({
          platform: 'twitter',
          leads: [],
          posts: [],
          scrapedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Instagram Scraping
    if (this.config.enabledSources.instagram) {
      try {
        console.log('[HI5 Orchestrator] Scraping Instagram...');
        const instagramData = await scrapeInstagramData(
          this.config.keywords,
          this.config.hashtags
        );
        results.push({
          platform: 'instagram',
          leads: instagramData.leads,
          posts: instagramData.posts,
          scrapedAt: new Date().toISOString()
        });
        await this.delay(this.config.delayBetweenSources);
      } catch (error) {
        console.error('[HI5 Orchestrator] Instagram scraping failed:', error);
        results.push({
          platform: 'instagram',
          leads: [],
          posts: [],
          scrapedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`[HI5 Orchestrator] Scraping completed. Found ${this.getTotalLeads(results)} leads across ${results.length} sources.`);

    return results;
  }

  private convertRFPsToLeads(rfps: RFPData[]): HI5LeadData[] {
    return rfps.map(rfp => ({
      id: `rfp-lead-${rfp.id}`,
      company: rfp.agency,
      contact: rfp.contactInfo.name,
      email: rfp.contactInfo.email,
      phone: rfp.contactInfo.phone,
      title: 'Procurement Officer',
      industry: this.inferIndustryFromAgency(rfp.agency),
      companySize: '1000+', // Most government agencies are large
      location: 'Texas, USA',
      services: ['Telecom/IT Infrastructure'], // Broad category for RFPs
      message: `Active RFP: ${rfp.title}. ${rfp.description}`,
      source: `RFP Board (${rfp.source})`,
      sourceUrl: rfp.url,
      qualificationScore: 95, // RFPs are highly qualified leads
      dealValue: rfp.value,
      createdAt: new Date().toISOString(),
      tags: ['rfp', 'government', 'qualified', 'high-priority'],
      rfpReference: rfp
    }));
  }

  private inferIndustryFromAgency(agency: string): string {
    const lowerAgency = agency.toLowerCase();

    if (lowerAgency.includes('school') || lowerAgency.includes('education') || lowerAgency.includes('isd')) {
      return 'Education';
    }
    if (lowerAgency.includes('health') || lowerAgency.includes('hospital') || lowerAgency.includes('medical')) {
      return 'Healthcare';
    }
    if (lowerAgency.includes('community college') || lowerAgency.includes('university')) {
      return 'Higher Education';
    }
    if (lowerAgency.includes('county') || lowerAgency.includes('city') || lowerAgency.includes('state')) {
      return 'Government';
    }

    return 'Government';
  }

  private getTotalLeads(results: ScrapingResult[]): number {
    return results.reduce((total, result) => total + result.leads.length, 0);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Method to get aggregated results
  getAggregatedResults(results: ScrapingResult[]): {
    totalLeads: number;
    totalPosts: number;
    totalRFPs: number;
    leadsBySource: Record<string, number>;
    topKeywords: string[];
    errors: string[];
  } {
    const totalLeads = results.reduce((sum, r) => sum + r.leads.length, 0);
    const totalPosts = results.reduce((sum, r) => sum + (r.posts?.length || 0), 0);
    const totalRFPs = results.reduce((sum, r) => sum + (r.rfps?.length || 0), 0);

    const leadsBySource: Record<string, number> = {};
    const keywordCounts: Record<string, number> = {};
    const errors: string[] = [];

    for (const result of results) {
      leadsBySource[result.platform] = result.leads.length;

      if (result.error) {
        errors.push(`${result.platform}: ${result.error}`);
      }

      // Count keywords from posts and leads
      for (const post of result.posts || []) {
        for (const keyword of post.keywords) {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        }
      }

      for (const lead of result.leads) {
        for (const tag of lead.tags || []) {
          if (this.config.keywords.some(kw => kw.toLowerCase() === tag.toLowerCase())) {
            keywordCounts[tag] = (keywordCounts[tag] || 0) + 1;
          }
        }
      }
    }

    const topKeywords = Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([keyword]) => keyword);

    return {
      totalLeads,
      totalPosts,
      totalRFPs,
      leadsBySource,
      topKeywords,
      errors
    };
  }
}

export async function runHI5LeadDiscovery(config?: Partial<ScrapingConfig>): Promise<{
  results: ScrapingResult[];
  summary: any;
}> {
  const orchestrator = new ScraperOrchestrator(config);
  const results = await orchestrator.runFullScraping();
  const summary = orchestrator.getAggregatedResults(results);

  return { results, summary };
}
