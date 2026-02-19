/**
 * HI5 Types and Interfaces
 */

export interface RFPData {
  id: string;
  title: string;
  agency: string;
  description: string;
  value: string;
  deadline: string;
  category: string;
  source: string;
  url: string;
  postedDate: string;
  requirements: string[];
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface HI5LeadData {
  id: string;
  company: string;
  contact: string;
  email?: string;
  phone?: string;
  title?: string;
  industry?: string;
  companySize?: string;
  location?: string;
  services?: string[];
  message?: string;
  source: string;
  sourceUrl?: string;
  qualificationScore?: number;
  dealValue?: string;
  createdAt: string;
  tags?: string[];
  rfpReference?: RFPData;
}

export interface SocialMediaPost {
  id: string;
  platform: 'linkedin' | 'twitter' | 'instagram';
  author: string;
  content: string;
  url: string;
  postedAt: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  keywords: string[];
  relevanceScore: number;
}

export interface LinkedInProfile {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  profileUrl: string;
  about?: string;
  experience?: string[];
  skills?: string[];
  lastActive: string;
  relevanceScore: number;
}

export interface ScrapingResult {
  platform: string;
  leads: HI5LeadData[];
  posts?: SocialMediaPost[];
  rfps?: RFPData[];
  scrapedAt: string;
  error?: string;
}


