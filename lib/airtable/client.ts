// Centralized Airtable client factory
// Uses dynamic imports to avoid build-time initialization issues

export async function getAirtableBase() {
  const Airtable = (await import("airtable")).default;
  
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_USHA_BASE_ID;
  
  if (!apiKey || !baseId) {
    throw new Error("Airtable configuration missing");
  }
  
  return new Airtable({ apiKey }).base(baseId);
}

// Alias for convenience
export const getBase = getAirtableBase;
