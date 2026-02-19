// SpaceBaddie Domain Types
// Revolutionary Content Creation Platform

export interface SpaceBaddieMasterData {
  studio: StudioState;
  automation: AutomationState;
  crm: CRMState;
  projects: ProjectState;
  insights: InsightsState;
  pricing: PricingState;
}

export interface StudioState {
  avatar: AvatarConfig;
  camera: CameraControls;
  effects: VisualEffects;
  lens: LensEffects;
  aiSuggestions: AISuggestions;
  script?: string;
  sceneType?: 'talking_head' | 'dramatic' | 'dialogue' | 'action' | 'ambient' | 'product';
  isDraft?: boolean;
}

export interface AvatarConfig {
  baseModel: string;
  customizations: AvatarCustomization[];
  animations: AnimationPreset[];
  voice: VoiceConfig;
}

export interface CameraControls {
  position: Vector3D;
  rotation: Vector3D;
  zoom: number;
  joystick: JoystickState;
}

export interface JoystickState {
  x: number; // -1 to 1
  y: number; // -1 to 1
  sensitivity: number;
  smoothing: boolean;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface VisualEffects {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  vignette: number;
}

export interface LensEffects {
  type: 'cinematic' | 'vintage' | 'anime' | 'gaming' | 'portrait' | 'action';
  intensity: number;
  customParams: Record<string, any>;
}

export interface AISuggestions {
  optimalCamera: CameraControls;
  recommendedEffects: VisualEffects;
  lensSuggestions: LensEffects[];
  confidence: number;
}

export interface AutomationPerformance {
  totalPosts: number;
  successfulPosts: number;
  failedPosts: number;
  engagementRate: number;
  reach: number;
  conversions: number;
}

export interface AutomationState {
  socialPlatforms: SocialPlatform[];
  postingSchedule: PostingSchedule;
  contentQueue: ContentQueueItem[];
  performance: AutomationPerformance;
}

export interface SocialPlatform {
  name: 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'facebook' | 'linkedin';
  connected: boolean;
  dailyLimit: number;
  postsToday: number;
  apiKey?: string;
}

export interface PostingSchedule {
  frequency: 'hourly' | 'daily' | 'weekly';
  optimalTimes: TimeSlot[];
  autoOptimize: boolean;
}

export interface ContentQueueItem {
  id: string;
  content: ContentAsset;
  platforms: string[];
  scheduledTime: Date;
  status: 'queued' | 'posting' | 'posted' | 'failed';
  performance?: ContentPerformance;
}

export interface CRMState {
  leads: Lead[];
  sequences: Sequence[];
  campaigns: Campaign[];
  analytics: CRMAnalytics;
}

export interface Lead {
  id: string;
  source: 'social' | 'website' | 'referral';
  platform?: string;
  contact: ContactInfo;
  engagement: EngagementMetrics;
  stage: 'prospect' | 'engaged' | 'qualified' | 'converted';
  tags: string[];
  lastActivity: Date;
}

export interface Sequence {
  id: string;
  name: string;
  steps: SequenceStep[];
  triggers: SequenceTrigger[];
  active: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'social' | 'email' | 'sms';
  status: 'draft' | 'active' | 'paused' | 'completed';
  targetAudience: TargetAudience;
  metrics: CampaignMetrics;
}

export interface ProjectState {
  active: Project[];
  templates: ProjectTemplate[];
  assets: AssetLibrary;
  collaboration: CollaborationState;
}

export interface Project {
  id: string;
  name: string;
  type: 'gaming' | 'business' | 'social' | 'educational';
  assets: ContentAsset[];
  team: TeamMember[];
  status: 'planning' | 'production' | 'review' | 'published';
  timeline: ProjectTimeline;
}

export interface InsightsState {
  performance: PerformanceMetrics;
  trends: TrendAnalysis;
  recommendations: AIRecommendation[];
  predictions: PredictionData;
}

export interface PricingState {
  tier: 'free' | 'pro' | 'enterprise';
  limits: UsageLimits;
  features: FeatureAccess[];
  billing: BillingInfo;
}

export interface UsageLimits {
  avatarsPerMonth: number;
  socialPostsPerDay: number;
  crmContacts: number;
  projects: number;
  storageGB: number;
}

export interface FeatureAccess {
  feature: string;
  access: 'none' | 'limited' | 'full';
  upgradeRequired: boolean;
}

// Supporting Types
export interface AvatarCustomization {
  category: string;
  option: string;
  value: any;
}

export interface AnimationPreset {
  name: string;
  duration: number;
  keyframes: Keyframe[];
}

export interface VoiceConfig {
  provider: string;
  voiceId: string;
  language: string;
  style: string;
}

export interface TimeSlot {
  day: number;
  hour: number;
  performance: number;
}

export interface ContentAsset {
  id: string;
  type: 'video' | 'image' | 'audio' | 'text';
  url: string;
  metadata: AssetMetadata;
}

export interface AssetMetadata {
  duration?: number;
  resolution?: string;
  size: number;
  created: Date;
  tags: string[];
}

export interface ContentPerformance {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  engagement: number;
  conversions: number;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  socialHandle?: string;
  name?: string;
}

export interface EngagementMetrics {
  totalInteractions: number;
  lastInteraction: Date;
  preferredPlatform: string;
  engagementScore: number;
}

export interface SequenceStep {
  id: string;
  type: 'email' | 'social' | 'sms' | 'wait';
  delay: number;
  content: any;
}

export interface SequenceTrigger {
  event: string;
  conditions: any;
}

export interface TargetAudience {
  demographics: any;
  interests: string[];
  behavior: any;
}

export interface CampaignMetrics {
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  roi: number;
}

export interface CRMAnalytics {
  totalLeads: number;
  conversionRate: number;
  avgResponseTime: number;
  revenueGenerated: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  category: string;
  structure: ProjectStructure;
}

export interface ProjectStructure {
  phases: Phase[];
  deliverables: Deliverable[];
  timeline: number; // days
}

export interface Phase {
  name: string;
  duration: number;
  tasks: Task[];
}

export interface Deliverable {
  name: string;
  type: string;
  deadline: Date;
}

export interface Task {
  name: string;
  assignee?: string;
  status: 'todo' | 'in_progress' | 'done';
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface ProjectTimeline {
  startDate: Date;
  endDate: Date;
  milestones: Milestone[];
}

export interface Milestone {
  name: string;
  date: Date;
  completed: boolean;
}

export interface AssetLibrary {
  videos: ContentAsset[];
  images: ContentAsset[];
  audio: ContentAsset[];
  templates: ContentAsset[];
}

export interface CollaborationState {
  comments: Comment[];
  reviews: Review[];
  permissions: Permission[];
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  replies: Comment[];
}

export interface Review {
  id: string;
  reviewer: string;
  status: 'pending' | 'approved' | 'rejected';
  comments: string;
  timestamp: Date;
}

export interface Permission {
  user: string;
  role: 'owner' | 'editor' | 'viewer';
}

export interface PerformanceMetrics {
  overallROI: number;
  contentPerformance: ContentPerformance[];
  audienceGrowth: AudienceGrowth;
  revenueMetrics: RevenueMetrics;
}

export interface AudienceGrowth {
  followers: number;
  growthRate: number;
  demographics: any;
}

export interface RevenueMetrics {
  totalRevenue: number;
  avgOrderValue: number;
  conversionRate: number;
}

export interface TrendAnalysis {
  topContent: ContentAsset[];
  peakTimes: TimeSlot[];
  audiencePreferences: any;
  competitorAnalysis: any;
}

export interface AIRecommendation {
  type: 'content' | 'timing' | 'platform' | 'strategy';
  title: string;
  description: string;
  impact: number;
  confidence: number;
}

export interface PredictionData {
  growthProjection: number[];
  contentDemand: any;
  marketTrends: any;
}

export interface Keyframe {
  time: number;
  properties: Record<string, any>;
}

export interface BillingInfo {
  currentPlan: string;
  nextBilling: Date;
  paymentMethod: string;
  usage: UsageStats;
}

export interface UsageStats {
  avatarsUsed: number;
  postsMade: number;
  contactsManaged: number;
  storageUsed: number;
}

// Video Generation Types
export interface VideoSuggestion {
  id?: string;
  type: 'gaming' | 'lifestyle' | 'educational' | 'promotional';
  style: 'cinematic' | 'energetic' | 'dramatic' | 'minimalist';
  duration: number;
  confidence: number;
  description?: string;
  title?: string;
}

// Signal Types for SpaceBaddie
export type SpaceBaddieSignal =
  | { type: 'avatar_created'; payload: AvatarConfig }
  | { type: 'camera_adjusted'; payload: CameraControls }
  | { type: 'content_posted'; payload: ContentQueueItem }
  | { type: 'lead_converted'; payload: Lead }
  | { type: 'project_completed'; payload: Project }
  | { type: 'insight_discovered'; payload: AIRecommendation }
  | { type: 'video_generation_started'; payload: any };
