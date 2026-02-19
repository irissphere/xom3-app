import { createClient } from '@supabase/supabase-js';
import { NormalizedData } from './data-flow-processor';

export interface DataFlowRecord extends NormalizedData {
  receivedAt: string;
}

const DATA_FLOW_STORE: DataFlowRecord[] = [];
const MAX_RECORDS = 5000;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function recordDataFlow(record: NormalizedData): Promise<void> {
  const receivedAt = new Date().toISOString();
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { error } = await supabase.from('xom3_data_flow').insert({
      id: record.id,
      domain: record.domain,
      lane: record.lane,
      visitor_id: record.visitorId,
      data_type: record.dataType,
      payload: record.normalizedPayload,
      consent_validated: record.consentValidated,
      anonymized: record.anonymized,
      occurred_at: record.timestamp,
      received_at: receivedAt
    });

    if (!error) {
      return;
    }

    console.warn('[DATA FLOW] Supabase insert failed, using memory store.', error.message);
  }

  DATA_FLOW_STORE.unshift({ ...record, receivedAt });
  if (DATA_FLOW_STORE.length > MAX_RECORDS) {
    DATA_FLOW_STORE.length = MAX_RECORDS;
  }
}

export async function listDataFlowRecords(params: {
  domain?: string;
  visitorId?: string;
  dataType?: string;
  limit?: number;
}): Promise<DataFlowRecord[]> {
  const { domain, visitorId, dataType, limit = 200 } = params;
  const supabase = getSupabaseAdmin();
  const cappedLimit = Math.max(1, Math.min(limit, MAX_RECORDS));

  if (supabase) {
    let query = supabase
      .from('xom3_data_flow')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(cappedLimit);

    if (domain) query = query.eq('domain', domain);
    if (visitorId) query = query.eq('visitor_id', visitorId);
    if (dataType) query = query.eq('data_type', dataType);

    const { data, error } = await query;
    if (!error && data) {
      return data.map(record => ({
        id: record.id,
        domain: record.domain,
        lane: record.lane,
        visitorId: record.visitor_id,
        dataType: record.data_type,
        normalizedPayload: record.payload,
        consentValidated: record.consent_validated,
        anonymized: record.anonymized,
        timestamp: new Date(record.occurred_at),
        receivedAt: record.received_at
      }));
    }

    if (error) {
      console.warn('[DATA FLOW] Supabase read failed, using memory store.', error.message);
    }
  }

  return DATA_FLOW_STORE.filter(record => {
    if (domain && record.domain !== domain) return false;
    if (visitorId && record.visitorId !== visitorId) return false;
    if (dataType && record.dataType !== dataType) return false;
    return true;
  }).slice(0, cappedLimit);
}
