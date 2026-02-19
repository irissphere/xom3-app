// Client Identity Layer - Phase III Lane 4
// Token-based authentication for client portal access

import crypto from "crypto";
import { getBase } from "@/lib/airtable/client";

export interface ClientToken {
  token: string;
  clientId: string;
  email: string;
  expiresAt: string;
  createdAt: string;
}

export interface ClientIdentity {
  id: string;
  airtableId: string;
  email: string;
  name: string;
  token?: string;
  linkedAirtableRecord?: string;
  linkedExom3Record?: string;
  complianceProfile?: string;
}

/**
 * Generate a secure token for client access
 */
export function generateClientToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create or retrieve client identity
 */
export async function getOrCreateClientIdentity(email: string): Promise<ClientIdentity> {
  try {
    const base = await getBase();
    // Check if client exists in Airtable
    const records = await base("Clients")
      .select({ filterByFormula: `{Email} = '${email}'` })
      .firstPage();

    if (records.length > 0) {
      const record = records[0];
      return {
        id: record.id,
        airtableId: record.id,
        email: record.fields.Email as string,
        name: record.fields.Name as string,
        linkedAirtableRecord: record.id
      };
    }

    // Client doesn't exist - this would typically be created by an agent
    // For now, return a minimal identity
    throw new Error(`Client not found: ${email}`);
  } catch (error: any) {
    throw new Error(`Failed to get client identity: ${error.message}`);
  }
}

/**
 * Validate client token
 */
export async function validateClientToken(token: string): Promise<ClientIdentity | null> {
  try {
    const base = await getBase();
    // In production, tokens would be stored in a secure table
    // For now, we'll check if token matches a pattern and validate against client
    // This is a simplified version - in production, use a proper token store
    
    // For MVP: tokens are stored in a Client Tokens table in Airtable
    const tokenRecords = await base("Client Tokens")
      .select({ 
        filterByFormula: `{Token} = '${token}'`,
        maxRecords: 1
      })
      .firstPage();

    if (tokenRecords.length === 0) {
      return null;
    }

    const tokenRecord = tokenRecords[0];
    const clientId = tokenRecord.fields["Client"] as string[];
    
    if (!clientId || clientId.length === 0) {
      return null;
    }

    // Get client record
    const clientRecords = await base("Clients")
      .select({ filterByFormula: `RECORD_ID() = '${clientId[0]}'` })
      .firstPage();

    if (clientRecords.length === 0) {
      return null;
    }

    const client = clientRecords[0];
    
    // Check if token is expired
    const expiresAt = tokenRecord.fields["Expires At"] as string;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return null;
    }

    return {
      id: client.id,
      airtableId: client.id,
      email: client.fields.Email as string,
      name: client.fields.Name as string,
      linkedAirtableRecord: client.id
    };
  } catch (error: any) {
    console.error("[Client Auth] Token validation failed:", error);
    return null;
  }
}

/**
 * Create a new client token
 */
export async function createClientToken(clientId: string, email: string): Promise<ClientToken> {
  const token = generateClientToken();
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Token valid for 1 year

  try {
    const base = await getBase();
    // Store token in Airtable (Client Tokens table)
    await base("Client Tokens").create([{
      fields: {
        "Token": token,
        "Client": [clientId],
        "Email": email,
        "Expires At": expiresAt.toISOString(),
        "Created At": new Date().toISOString()
      }
    }]);

    return {
      token,
      clientId,
      email,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString()
    };
  } catch (error: any) {
    throw new Error(`Failed to create client token: ${error.message}`);
  }
}

/**
 * Get client identity from request (checks token in header or query)
 */
export async function getClientFromRequest(req: Request): Promise<ClientIdentity | null> {
  // Check Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return await validateClientToken(token);
  }

  // Check query parameter
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (token) {
    return await validateClientToken(token);
  }

  return null;
}
