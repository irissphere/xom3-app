import { DataFlowSignal } from './types';
import { validateConsent } from './consent-validator';
import { emitDataFlowSignal } from './signal-emitter';
import { recordDataFlow } from './data-store';

export interface RawDataInput {
  source: string;
  domain: 'benefitscrm' | 'healthcrm' | 'broadcast' | 'commerce';
  visitorId: string;
  dataType: 'intent' | 'behavior' | 'conversion' | 'enrichment' | 'anonymous';
  payload: any;
  timestamp: Date;
}

export interface NormalizedData {
  id: string;
  domain: string;
  lane: string;
  visitorId: string;
  dataType: string;
  normalizedPayload: any;
  consentValidated: boolean;
  anonymized: boolean;
  timestamp: Date;
}

export async function processDataFlow(input: RawDataInput): Promise<NormalizedData | null> {
  // Step 1: Validate consent
  const consentCheck = await validateConsent(input.visitorId, input.domain);

  // Emit data capture signal
  await emitDataFlowSignal({
    source: input.source,
    type: 'data-captured',
    severity: 'info',
    payload: {
      domain: input.domain,
      lane: determineLane(input.dataType),
      dataType: input.dataType,
      consentValidated: consentCheck.valid,
      anonymized: false,
      size: JSON.stringify(input.payload).length
    }
  });

  if (!consentCheck.valid && input.dataType !== 'anonymous') {
    // If consent not valid and data isn't anonymous, reject
    return null;
  }

  // Step 2: Normalize data
  const normalized = await normalizeData(input, consentCheck.valid);

  // Emit normalization signal
  await emitDataFlowSignal({
    source: input.source,
    type: 'data-normalized',
    severity: 'info',
    payload: {
      domain: input.domain,
      lane: normalized.lane,
      dataType: input.dataType,
      consentValidated: consentCheck.valid,
      anonymized: normalized.anonymized,
      size: JSON.stringify(normalized.normalizedPayload).length
    }
  });

  // Step 3: Store data (placeholder - implement based on your storage)
  await storeNormalizedData(normalized);

  // Emit storage signal
  await emitDataFlowSignal({
    source: input.source,
    type: 'data-stored',
    severity: 'info',
    payload: {
      domain: input.domain,
      lane: normalized.lane,
      dataType: input.dataType,
      consentValidated: consentCheck.valid,
      anonymized: normalized.anonymized,
      size: JSON.stringify(normalized.normalizedPayload).length
    }
  });

  return normalized;
}

function determineLane(dataType: string): string {
  switch (dataType) {
    case 'intent':
      return 'intake';
    case 'behavior':
      return 'followup';
    case 'conversion':
      return 'eligibility';
    case 'enrichment':
      return 'automation';
    default:
      return 'intake';
  }
}

async function normalizeData(input: RawDataInput, hasConsent: boolean): Promise<NormalizedData> {
  let normalizedPayload = { ...input.payload };
  let anonymized = false;

  // Apply normalization based on domain and data type
  switch (input.domain) {
    case 'benefitscrm':
      normalizedPayload = normalizeBenefitsCRMData(input);
      break;
    case 'healthcrm':
      normalizedPayload = normalizeHealthCRMData(input);
      break;
    case 'commerce':
      normalizedPayload = normalizeCommerceData(input);
      break;
    case 'broadcast':
      normalizedPayload = normalizeBroadcastData(input);
      break;
  }

  // Anonymize if no consent
  if (!hasConsent) {
    normalizedPayload = anonymizePayload(normalizedPayload);
    anonymized = true;
  }

  return {
    id: generateId(),
    domain: input.domain,
    lane: determineLane(input.dataType),
    visitorId: input.visitorId,
    dataType: input.dataType,
    normalizedPayload,
    consentValidated: hasConsent,
    anonymized,
    timestamp: input.timestamp
  };
}

function normalizeBenefitsCRMData(input: RawDataInput): any {
  // Benefits CRM specific normalization
  const payload = input.payload;

  return {
    leadType: payload.leadType || 'unknown',
    benefitType: payload.benefitType,
    income: payload.income ? Math.floor(payload.income / 10000) * 10000 : undefined, // Round to nearest 10k
    location: payload.location?.state || 'unknown',
    intent: payload.intent || [],
    timestamp: input.timestamp
  };
}

function normalizeHealthCRMData(input: RawDataInput): any {
  // Health CRM specific normalization
  const payload = input.payload;

  return {
    condition: payload.condition,
    ageRange: payload.age ? `${Math.floor(payload.age / 10) * 10}s` : undefined,
    location: payload.location?.state || 'unknown',
    insuranceType: payload.insuranceType,
    intent: payload.intent || [],
    timestamp: input.timestamp
  };
}

function normalizeCommerceData(input: RawDataInput): any {
  // Commerce specific normalization
  const payload = input.payload;

  return {
    productCategory: payload.productCategory,
    priceRange: payload.price ? `${Math.floor(payload.price / 50) * 50}-${Math.ceil(payload.price / 50) * 50}` : undefined,
    purchaseIntent: payload.purchaseIntent,
    cartValue: payload.cartValue,
    timestamp: input.timestamp
  };
}

function normalizeBroadcastData(input: RawDataInput): any {
  // Broadcast specific normalization
  const payload = input.payload;

  return {
    contentType: payload.contentType,
    topic: payload.topic,
    engagement: payload.engagement,
    platform: payload.platform,
    timestamp: input.timestamp
  };
}

function anonymizePayload(payload: any): any {
  const anonymized = { ...payload };

  // Remove or hash personally identifiable information
  delete anonymized.email;
  delete anonymized.phone;
  delete anonymized.name;
  delete anonymized.address;

  // Hash IP if present
  if (anonymized.ip) {
    anonymized.ipHash = hashString(anonymized.ip);
    delete anonymized.ip;
  }

  return anonymized;
}

function hashString(str: string): string {
  // Simple hash for demo - use proper crypto in production
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function storeNormalizedData(data: NormalizedData): Promise<void> {
  await recordDataFlow(data);
}
