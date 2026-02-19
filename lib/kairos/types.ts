// Kairos CRM — Type Definitions

export type ClientStatus = 'lead' | 'onboarding' | 'active' | 'paused' | 'churned';
export type ClientTier = 'starter' | 'growth' | 'enterprise' | 'custom';
export type ClientSource = 'referral' | 'organic' | 'paid' | 'partner' | 'inbound';

export interface KairosClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: ClientStatus;
  tier: ClientTier;
  source: ClientSource;
  assignedTo?: string;
  healthScore: number;
  mrr: number;
  contractStart?: string;
  contractEnd?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type InteractionType = 'call' | 'email' | 'meeting' | 'support' | 'note' | 'task';
export type InteractionDirection = 'inbound' | 'outbound';
export type InteractionOutcome = 'positive' | 'neutral' | 'negative' | 'pending';
export type InteractionSentiment = 'positive' | 'neutral' | 'negative';
export type InteractionPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface KairosInteraction {
  id: string;
  clientId: string;
  clientName?: string;
  type: InteractionType;
  direction: InteractionDirection;
  subject: string;
  summary?: string;
  outcome: InteractionOutcome;
  assignedTo?: string;
  scheduledAt?: string;
  completedAt?: string;
  followUpDate?: string;
  sentiment: InteractionSentiment;
  priority: InteractionPriority;
  tags: string[];
  createdAt: string;
}

export type BillingType = 'invoice' | 'payment' | 'refund' | 'credit' | 'subscription';
export type BillingStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
export type Currency = 'USD' | 'EUR' | 'GBP';

export interface KairosBilling {
  id: string;
  clientId: string;
  clientName?: string;
  type: BillingType;
  status: BillingStatus;
  amount: number;
  currency: Currency;
  dueDate?: string;
  paidDate?: string;
  invoiceNumber?: string;
  stripeId?: string;
  description?: string;
  periodStart?: string;
  periodEnd?: string;
  createdAt: string;
}

export type SocialPlatform = 'twitter' | 'linkedin' | 'instagram' | 'facebook' | 'threads';
export type SocialStatus = 'draft' | 'scheduled' | 'posted' | 'failed' | 'cancelled';

export interface KairosSocialPost {
  id: string;
  clientId: string;
  clientName?: string;
  platform: SocialPlatform;
  status: SocialStatus;
  content: string;
  mediaUrl?: string;
  scheduledFor?: string;
  postedAt?: string;
  engagement: number;
  campaign?: string;
  template?: string;
  approvedBy?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
}

// API Response Types
export interface KairosListResponse<T> {
  records: T[];
  total: number;
  offset?: string;
}

export interface KairosClientDetail extends KairosClient {
  recentInteractions: KairosInteraction[];
  billingHistory: KairosBilling[];
  socialPosts: KairosSocialPost[];
}

// UOI Signal Types for Kairos
export type KairosSignalType = 
  | 'kairos:client:created'
  | 'kairos:client:updated'
  | 'kairos:client:status_changed'
  | 'kairos:client:health_alert'
  | 'kairos:interaction:created'
  | 'kairos:interaction:completed'
  | 'kairos:billing:created'
  | 'kairos:billing:paid'
  | 'kairos:billing:overdue'
  | 'kairos:social:scheduled'
  | 'kairos:social:posted'
  | 'kairos:social:failed';

export interface KairosSignalPayload {
  entityType: 'client' | 'interaction' | 'billing' | 'social';
  entityId: string;
  action: string;
  previousValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
}

// Dashboard Stats
export interface KairosDashboardStats {
  clients: {
    total: number;
    active: number;
    onboarding: number;
    atRisk: number;
    churned: number;
  };
  billing: {
    mrr: number;
    outstanding: number;
    paidThisMonth: number;
    overdueCount: number;
  };
  interactions: {
    todayCount: number;
    pendingFollowUps: number;
    urgentTasks: number;
  };
  social: {
    scheduledCount: number;
    postedThisWeek: number;
    draftsCount: number;
  };
}
