// Kairos CRM — Service Layer
// CRUD operations for all Kairos tables with UOI signal emission

import { getKairosBase, KAIROS_TABLES } from "./client";
import {
  emitClientStatusChange,
  emitClientHealthAlert,
  emitBillingEvent,
  emitSocialSignal,
  emitInteractionCreated,
  emitKairosSignal,
} from "./signals";
import type {
  KairosClient,
  KairosInteraction,
  KairosBilling,
  KairosSocialPost,
  KairosListResponse,
  KairosClientDetail,
  KairosDashboardStats,
  ClientStatus,
  ClientTier,
  ClientSource,
} from "./types";

// ============================================================
// CLIENTS
// ============================================================

function mapClientRecord(record: any): KairosClient {
  const fields = record.fields || record;
  return {
    id: record.id || fields.id,
    name: fields.Name || fields.name || "",
    email: fields.Email || fields.email || "",
    phone: fields.Phone || fields.phone || "",
    status: (fields.Status || fields.status || "lead") as ClientStatus,
    tier: (fields["Subscription Tier"] || fields.tier || "starter") as ClientTier,
    source: (fields.Source || fields.source || "organic") as ClientSource,
    assignedTo: fields.Tenant || fields.tenant || "",
    healthScore: Number(fields["Health Score"] || fields.health_score || 100),
    mrr: Number(fields.MRR || fields.mrr || 0),
    contractStart: fields["Contract Start"] || fields.contract_start || "",
    contractEnd: fields["Contract End"] || fields.contract_end || "",
    notes: fields.Notes || fields.notes || "",
    tags: fields.Tags || fields.tags || [],
    createdAt: fields["Created Date"] || fields.created_at || new Date().toISOString(),
    updatedAt: fields["Last Contact"] || fields.updated_at || new Date().toISOString(),
  };
}

export async function listClients(options: {
  status?: ClientStatus;
  limit?: number;
  offset?: string;
} = {}): Promise<KairosListResponse<KairosClient>> {
  const base = await getKairosBase();
  const records: KairosClient[] = [];
  
  let query = base(KAIROS_TABLES.CLIENTS).select({
    maxRecords: options.limit || 100,
    sort: [{ field: "Created Date", direction: "desc" }],
  });
  
  if (options.status) {
    query = base(KAIROS_TABLES.CLIENTS).select({
      maxRecords: options.limit || 100,
      filterByFormula: `{Status} = "${options.status}"`,
      sort: [{ field: "Created Date", direction: "desc" }],
    });
  }
  
  await query.eachPage((pageRecords, fetchNextPage) => {
    pageRecords.forEach((record) => {
      records.push(mapClientRecord(record));
    });
    fetchNextPage();
  });
  
  return { records, total: records.length };
}

export async function getClient(clientId: string): Promise<KairosClient | null> {
  const base = await getKairosBase();
  try {
    const record = await base(KAIROS_TABLES.CLIENTS).find(clientId);
    return mapClientRecord(record);
  } catch (error) {
    console.error("[Kairos] getClient error:", error);
    return null;
  }
}

export async function createClient(data: Partial<KairosClient>): Promise<KairosClient> {
  const base = await getKairosBase();
  
  const record = await base(KAIROS_TABLES.CLIENTS).create({
    Name: data.name,
    Email: data.email,
    Phone: data.phone || "",
    Status: data.status || "lead",
    "Subscription Tier": data.tier || "starter",
    "Onboarding Status": data.status === "onboarding" ? "In Progress" : "",
    Source: data.source || "organic",
    Tenant: data.assignedTo || "",
    Notes: data.notes || "",
  });
  
  const client = mapClientRecord(record);
  
  // Emit signal
  emitKairosSignal("kairos:client:created", {
    entityType: "client",
    entityId: client.id,
    action: "created",
    newValue: { name: client.name, status: client.status },
  });
  
  return client;
}

export async function updateClient(
  clientId: string,
  data: Partial<KairosClient>
): Promise<KairosClient> {
  const base = await getKairosBase();
  
  // Get previous state for signal comparison
  const previous = await getClient(clientId);
  
  const updateFields: Record<string, any> = {};
  if (data.name !== undefined) updateFields.Name = data.name;
  if (data.email !== undefined) updateFields.Email = data.email;
  if (data.phone !== undefined) updateFields.Phone = data.phone;
  if (data.status !== undefined) updateFields.Status = data.status;
  if (data.tier !== undefined) updateFields["Subscription Tier"] = data.tier;
  if (data.source !== undefined) updateFields.Source = data.source;
  if (data.assignedTo !== undefined) updateFields.Tenant = data.assignedTo;
  if (data.notes !== undefined) updateFields.Notes = data.notes;
  
  const record = await base(KAIROS_TABLES.CLIENTS).update(clientId, updateFields);
  const client = mapClientRecord(record);
  
  // Emit signals based on changes
  if (previous) {
    if (data.status && data.status !== previous.status) {
      emitClientStatusChange(client.id, client.name, previous.status, data.status);
    }
    
    if (data.healthScore !== undefined && data.healthScore < previous.healthScore) {
      emitClientHealthAlert(client.id, client.name, data.healthScore, previous.healthScore);
    }
  }
  
  return client;
}

export async function deleteClient(clientId: string): Promise<void> {
  const base = await getKairosBase();
  await base(KAIROS_TABLES.CLIENTS).destroy(clientId);
}

// ============================================================
// INTERACTIONS
// ============================================================

function mapInteractionRecord(record: any): KairosInteraction {
  const fields = record.fields || record;
  return {
    id: record.id || fields.id,
    clientId: (fields.client || fields.Client || [])[0] || "",
    clientName: fields.client_name || "",
    type: fields.type || fields.Type || "note",
    direction: fields.direction || fields.Direction || "outbound",
    subject: fields.subject || fields.Subject || "",
    summary: fields.summary || fields.Summary || "",
    outcome: fields.outcome || fields.Outcome || "pending",
    assignedTo: fields.assigned_to || fields["Assigned To"] || "",
    scheduledAt: fields.scheduled_at || fields["Scheduled At"] || "",
    completedAt: fields.completed_at || fields["Completed At"] || "",
    followUpDate: fields.follow_up_date || fields["Follow Up Date"] || "",
    sentiment: fields.sentiment || fields.Sentiment || "neutral",
    priority: fields.priority || fields.Priority || "medium",
    tags: fields.tags || fields.Tags || [],
    createdAt: fields.created_at || fields["Created At"] || new Date().toISOString(),
  };
}

export async function listInteractions(options: {
  clientId?: string;
  type?: string;
  limit?: number;
} = {}): Promise<KairosListResponse<KairosInteraction>> {
  const base = await getKairosBase();
  const records: KairosInteraction[] = [];
  
  let filterFormula = "";
  if (options.clientId) {
    filterFormula = `FIND("${options.clientId}", ARRAYJOIN({client}))`;
  }
  if (options.type) {
    filterFormula = filterFormula 
      ? `AND(${filterFormula}, {type} = "${options.type}")`
      : `{type} = "${options.type}"`;
  }
  
  const query = base(KAIROS_TABLES.INTERACTIONS).select({
    maxRecords: options.limit || 100,
    filterByFormula: filterFormula || undefined,
    sort: [{ field: "created_at", direction: "desc" }],
  });
  
  await query.eachPage((pageRecords, fetchNextPage) => {
    pageRecords.forEach((record) => {
      records.push(mapInteractionRecord(record));
    });
    fetchNextPage();
  });
  
  return { records, total: records.length };
}

export async function createInteraction(data: Partial<KairosInteraction>): Promise<KairosInteraction> {
  const base = await getKairosBase();
  
  const record = await base(KAIROS_TABLES.INTERACTIONS).create({
    client: data.clientId ? [data.clientId] : [],
    type: data.type || "note",
    direction: data.direction || "outbound",
    subject: data.subject || "",
    summary: data.summary || "",
    outcome: data.outcome || "pending",
    assigned_to: data.assignedTo || "",
    scheduled_at: data.scheduledAt || "",
    follow_up_date: data.followUpDate || "",
    sentiment: data.sentiment || "neutral",
    priority: data.priority || "medium",
    tags: data.tags || [],
  });
  
  const interaction = mapInteractionRecord(record);
  
  // Emit signal
  emitInteractionCreated(
    interaction.id,
    interaction.clientId,
    interaction.type,
    interaction.priority
  );
  
  return interaction;
}

export async function updateInteraction(
  interactionId: string,
  data: Partial<KairosInteraction>
): Promise<KairosInteraction> {
  const base = await getKairosBase();
  
  const updateFields: Record<string, any> = {};
  if (data.type !== undefined) updateFields.type = data.type;
  if (data.direction !== undefined) updateFields.direction = data.direction;
  if (data.subject !== undefined) updateFields.subject = data.subject;
  if (data.summary !== undefined) updateFields.summary = data.summary;
  if (data.outcome !== undefined) updateFields.outcome = data.outcome;
  if (data.assignedTo !== undefined) updateFields.assigned_to = data.assignedTo;
  if (data.scheduledAt !== undefined) updateFields.scheduled_at = data.scheduledAt;
  if (data.completedAt !== undefined) updateFields.completed_at = data.completedAt;
  if (data.followUpDate !== undefined) updateFields.follow_up_date = data.followUpDate;
  if (data.sentiment !== undefined) updateFields.sentiment = data.sentiment;
  if (data.priority !== undefined) updateFields.priority = data.priority;
  if (data.tags !== undefined) updateFields.tags = data.tags;
  
  const record = await base(KAIROS_TABLES.INTERACTIONS).update(interactionId, updateFields);
  return mapInteractionRecord(record);
}

// ============================================================
// BILLING
// ============================================================

function mapBillingRecord(record: any): KairosBilling {
  const fields = record.fields || record;
  return {
    id: record.id || fields.id,
    clientId: (fields.client || fields.Client || [])[0] || "",
    clientName: fields.client_name || "",
    type: fields.type || fields.Type || "invoice",
    status: fields.status || fields.Status || "draft",
    amount: Number(fields.amount || fields.Amount || 0),
    currency: fields.currency || fields.Currency || "USD",
    dueDate: fields.due_date || fields["Due Date"] || "",
    paidDate: fields.paid_date || fields["Paid Date"] || "",
    invoiceNumber: fields.invoice_number || fields["Invoice Number"] || "",
    stripeId: fields.stripe_id || fields["Stripe ID"] || "",
    description: fields.description || fields.Description || "",
    periodStart: fields.period_start || fields["Period Start"] || "",
    periodEnd: fields.period_end || fields["Period End"] || "",
    createdAt: fields.created_at || fields["Created At"] || new Date().toISOString(),
  };
}

export async function listBilling(options: {
  clientId?: string;
  status?: string;
  limit?: number;
} = {}): Promise<KairosListResponse<KairosBilling>> {
  const base = await getKairosBase();
  const records: KairosBilling[] = [];
  
  let filterFormula = "";
  if (options.clientId) {
    filterFormula = `FIND("${options.clientId}", ARRAYJOIN({client}))`;
  }
  if (options.status) {
    filterFormula = filterFormula 
      ? `AND(${filterFormula}, {status} = "${options.status}")`
      : `{status} = "${options.status}"`;
  }
  
  const query = base(KAIROS_TABLES.BILLING).select({
    maxRecords: options.limit || 100,
    filterByFormula: filterFormula || undefined,
    sort: [{ field: "created_at", direction: "desc" }],
  });
  
  await query.eachPage((pageRecords, fetchNextPage) => {
    pageRecords.forEach((record) => {
      records.push(mapBillingRecord(record));
    });
    fetchNextPage();
  });
  
  return { records, total: records.length };
}

export async function createBilling(data: Partial<KairosBilling>): Promise<KairosBilling> {
  const base = await getKairosBase();
  
  const record = await base(KAIROS_TABLES.BILLING).create({
    client: data.clientId ? [data.clientId] : [],
    type: data.type || "invoice",
    status: data.status || "draft",
    amount: data.amount || 0,
    currency: data.currency || "USD",
    due_date: data.dueDate || "",
    invoice_number: data.invoiceNumber || "",
    stripe_id: data.stripeId || "",
    description: data.description || "",
    period_start: data.periodStart || "",
    period_end: data.periodEnd || "",
  });
  
  const billing = mapBillingRecord(record);
  
  // Emit signal
  emitBillingEvent(billing.id, billing.clientId, "created", billing.amount);
  
  return billing;
}

export async function updateBilling(
  billingId: string,
  data: Partial<KairosBilling>
): Promise<KairosBilling> {
  const base = await getKairosBase();
  
  // Get previous state for signal comparison
  let previousStatus: string | undefined;
  try {
    const prev = await base(KAIROS_TABLES.BILLING).find(billingId);
    previousStatus = prev.fields.status as string;
  } catch {}
  
  const updateFields: Record<string, any> = {};
  if (data.type !== undefined) updateFields.type = data.type;
  if (data.status !== undefined) updateFields.status = data.status;
  if (data.amount !== undefined) updateFields.amount = data.amount;
  if (data.currency !== undefined) updateFields.currency = data.currency;
  if (data.dueDate !== undefined) updateFields.due_date = data.dueDate;
  if (data.paidDate !== undefined) updateFields.paid_date = data.paidDate;
  if (data.invoiceNumber !== undefined) updateFields.invoice_number = data.invoiceNumber;
  if (data.stripeId !== undefined) updateFields.stripe_id = data.stripeId;
  if (data.description !== undefined) updateFields.description = data.description;
  if (data.periodStart !== undefined) updateFields.period_start = data.periodStart;
  if (data.periodEnd !== undefined) updateFields.period_end = data.periodEnd;
  
  const record = await base(KAIROS_TABLES.BILLING).update(billingId, updateFields);
  const billing = mapBillingRecord(record);
  
  // Emit signals based on status changes
  if (data.status && data.status !== previousStatus) {
    if (data.status === "paid") {
      emitBillingEvent(billing.id, billing.clientId, "paid", billing.amount);
    } else if (data.status === "overdue") {
      emitBillingEvent(billing.id, billing.clientId, "overdue", billing.amount);
    }
  }
  
  return billing;
}

// ============================================================
// SOCIAL QUEUE
// ============================================================

function mapSocialRecord(record: any): KairosSocialPost {
  const fields = record.fields || record;
  return {
    id: record.id || fields.id,
    clientId: (fields.client || fields.Client || [])[0] || "",
    clientName: fields.client_name || "",
    platform: fields.platform || fields.Platform || "twitter",
    status: fields.status || fields.Status || "draft",
    content: fields.content || fields.Content || "",
    mediaUrl: fields.media_url || fields["Media URL"] || "",
    scheduledFor: fields.scheduled_for || fields["Scheduled For"] || "",
    postedAt: fields.posted_at || fields["Posted At"] || "",
    engagement: Number(fields.engagement || fields.Engagement || 0),
    campaign: fields.campaign || fields.Campaign || "",
    template: fields.template || fields.Template || "",
    approvedBy: fields.approved_by || fields["Approved By"] || "",
    notes: fields.notes || fields.Notes || "",
    tags: fields.tags || fields.Tags || [],
    createdAt: fields.created_at || fields["Created At"] || new Date().toISOString(),
  };
}

export async function listSocialQueue(options: {
  clientId?: string;
  status?: string;
  platform?: string;
  limit?: number;
} = {}): Promise<KairosListResponse<KairosSocialPost>> {
  const base = await getKairosBase();
  const records: KairosSocialPost[] = [];
  
  const filters: string[] = [];
  if (options.clientId) {
    filters.push(`FIND("${options.clientId}", ARRAYJOIN({client}))`);
  }
  if (options.status) {
    filters.push(`{status} = "${options.status}"`);
  }
  if (options.platform) {
    filters.push(`{platform} = "${options.platform}"`);
  }
  
  const filterFormula = filters.length > 1 
    ? `AND(${filters.join(", ")})` 
    : filters[0] || "";
  
  const query = base(KAIROS_TABLES.SOCIAL_QUEUE).select({
    maxRecords: options.limit || 100,
    filterByFormula: filterFormula || undefined,
    sort: [{ field: "scheduled_for", direction: "asc" }],
  });
  
  await query.eachPage((pageRecords, fetchNextPage) => {
    pageRecords.forEach((record) => {
      records.push(mapSocialRecord(record));
    });
    fetchNextPage();
  });
  
  return { records, total: records.length };
}

export async function createSocialPost(data: Partial<KairosSocialPost>): Promise<KairosSocialPost> {
  const base = await getKairosBase();
  
  const record = await base(KAIROS_TABLES.SOCIAL_QUEUE).create({
    client: data.clientId ? [data.clientId] : [],
    platform: data.platform || "twitter",
    status: data.status || "draft",
    content: data.content || "",
    media_url: data.mediaUrl || "",
    scheduled_for: data.scheduledFor || "",
    campaign: data.campaign || "",
    template: data.template || "",
    approved_by: data.approvedBy || "",
    notes: data.notes || "",
    tags: data.tags || [],
  });
  
  const post = mapSocialRecord(record);
  
  // Emit signal if scheduled
  if (post.status === "scheduled") {
    emitSocialSignal(post.id, post.clientId, "scheduled", post.platform);
  }
  
  return post;
}

export async function updateSocialPost(
  postId: string,
  data: Partial<KairosSocialPost>
): Promise<KairosSocialPost> {
  const base = await getKairosBase();
  
  // Get previous state for signal comparison
  let previousStatus: string | undefined;
  try {
    const prev = await base(KAIROS_TABLES.SOCIAL_QUEUE).find(postId);
    previousStatus = prev.fields.status as string;
  } catch {}
  
  const updateFields: Record<string, any> = {};
  if (data.platform !== undefined) updateFields.platform = data.platform;
  if (data.status !== undefined) updateFields.status = data.status;
  if (data.content !== undefined) updateFields.content = data.content;
  if (data.mediaUrl !== undefined) updateFields.media_url = data.mediaUrl;
  if (data.scheduledFor !== undefined) updateFields.scheduled_for = data.scheduledFor;
  if (data.postedAt !== undefined) updateFields.posted_at = data.postedAt;
  if (data.engagement !== undefined) updateFields.engagement = data.engagement;
  if (data.campaign !== undefined) updateFields.campaign = data.campaign;
  if (data.template !== undefined) updateFields.template = data.template;
  if (data.approvedBy !== undefined) updateFields.approved_by = data.approvedBy;
  if (data.notes !== undefined) updateFields.notes = data.notes;
  if (data.tags !== undefined) updateFields.tags = data.tags;
  
  const record = await base(KAIROS_TABLES.SOCIAL_QUEUE).update(postId, updateFields);
  const post = mapSocialRecord(record);
  
  // Emit signals based on status changes
  if (data.status && data.status !== previousStatus) {
    if (data.status === "posted") {
      emitSocialSignal(post.id, post.clientId, "posted", post.platform);
    } else if (data.status === "failed") {
      emitSocialSignal(post.id, post.clientId, "failed", post.platform);
    } else if (data.status === "scheduled" && previousStatus !== "scheduled") {
      emitSocialSignal(post.id, post.clientId, "scheduled", post.platform);
    }
  }
  
  return post;
}

// ============================================================
// AGGREGATED DATA
// ============================================================

export async function getClientDetail(clientId: string): Promise<KairosClientDetail | null> {
  const client = await getClient(clientId);
  if (!client) return null;
  
  const [interactions, billing, social] = await Promise.all([
    listInteractions({ clientId, limit: 10 }),
    listBilling({ clientId, limit: 10 }),
    listSocialQueue({ clientId, limit: 10 }),
  ]);
  
  return {
    ...client,
    recentInteractions: interactions.records,
    billingHistory: billing.records,
    socialPosts: social.records,
  };
}

export async function getDashboardStats(): Promise<KairosDashboardStats> {
  const [clients, billing, interactions, social] = await Promise.all([
    listClients({ limit: 1000 }),
    listBilling({ limit: 1000 }),
    listInteractions({ limit: 100 }),
    listSocialQueue({ limit: 100 }),
  ]);
  
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  return {
    clients: {
      total: clients.total,
      active: clients.records.filter((c) => c.status === "active").length,
      onboarding: clients.records.filter((c) => c.status === "onboarding").length,
      atRisk: clients.records.filter((c) => c.healthScore < 50).length,
      churned: clients.records.filter((c) => c.status === "churned").length,
    },
    billing: {
      mrr: clients.records.reduce((sum, c) => sum + c.mrr, 0),
      outstanding: billing.records
        .filter((b) => b.status === "sent" || b.status === "overdue")
        .reduce((sum, b) => sum + b.amount, 0),
      paidThisMonth: billing.records
        .filter((b) => b.status === "paid" && b.paidDate?.startsWith(today.slice(0, 7)))
        .reduce((sum, b) => sum + b.amount, 0),
      overdueCount: billing.records.filter((b) => b.status === "overdue").length,
    },
    interactions: {
      todayCount: interactions.records.filter((i) => i.createdAt.startsWith(today)).length,
      pendingFollowUps: interactions.records.filter(
        (i) => i.followUpDate && i.followUpDate <= today && i.outcome === "pending"
      ).length,
      urgentTasks: interactions.records.filter((i) => i.priority === "urgent" && i.outcome === "pending").length,
    },
    social: {
      scheduledCount: social.records.filter((s) => s.status === "scheduled").length,
      postedThisWeek: social.records.filter((s) => s.status === "posted" && s.postedAt && s.postedAt >= weekAgo).length,
      draftsCount: social.records.filter((s) => s.status === "draft").length,
    },
  };
}
