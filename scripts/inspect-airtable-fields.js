/**
 * Inspect Airtable Fields
 * 
 * Lists all fields in each table to understand the actual structure
 */

import Airtable from 'airtable';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
try {
  // Next.js loads `.env.local` from the app root (`xom3-app/.env.local`).
  // Support both locations (app root + repo root) for convenience.
  const candidates = [
    path.join(__dirname, '../.env.local'),
    path.join(__dirname, '../../.env.local'),
  ];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    });
    break;
  }
} catch (e) {
  // Ignore
}

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = 'app4y7GKkeUfZm8rS';

if (!API_KEY) {
  console.error('❌ Missing AIRTABLE_API_KEY');
  process.exit(1);
}

const base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);

async function inspectTable(tableName) {
  try {
    const records = await base(tableName).select({ maxRecords: 10 }).all();
    
    if (records.length === 0) {
      return {
        exists: true,
        recordCount: 0,
        fields: [],
        sampleRecords: []
      };
    }
    
    // Get all unique field names from all records
    const allFields = new Set();
    records.forEach(r => {
      Object.keys(r.fields).forEach(f => allFields.add(f));
    });
    
    return {
      exists: true,
      recordCount: records.length,
      fields: Array.from(allFields),
      sampleRecords: records.slice(0, 3).map(r => ({
        id: r.id,
        fields: r.fields
      }))
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🔍 Inspecting Airtable Table Structures\n');
  console.log(`📦 Base: ${BASE_ID}\n`);
  
  const tables = ['Clients', 'Interactions', 'Billing'];
  const results = {};
  
  for (const tableName of tables) {
    console.log(`📋 ${tableName}...`);
    const result = await inspectTable(tableName);
    results[tableName] = result;
    
    if (result.exists) {
      console.log(`   ✅ Exists`);
      console.log(`   📊 Records: ${result.recordCount}`);
      console.log(`   📝 Fields (${result.fields.length}):`);
      result.fields.forEach(f => {
        console.log(`      - ${f}`);
      });
      if (result.sampleRecords.length > 0) {
        console.log(`   📄 Sample record:`);
        console.log(`      ${JSON.stringify(result.sampleRecords[0].fields, null, 6).substring(0, 200)}...`);
      }
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }
    console.log('');
  }
  
  // Generate field mapping document
  const mappingPath = path.join(__dirname, '../../AIRTABLE_FIELD_MAPPINGS.md');
  let mapping = `# Airtable Field Mappings\n\n`;
  mapping += `**Base ID:** ${BASE_ID}\n`;
  mapping += `**Date:** ${new Date().toISOString()}\n\n`;
  
  mapping += `## Actual Field Names\n\n`;
  for (const [table, result] of Object.entries(results)) {
    mapping += `### ${table}\n\n`;
    if (result.exists) {
      mapping += `**Fields Found:**\n`;
      result.fields.forEach(f => {
        mapping += `- \`${f}\`\n`;
      });
      mapping += `\n**Record Count:** ${result.recordCount}\n\n`;
    } else {
      mapping += `❌ Table not accessible: ${result.error}\n\n`;
    }
  }
  
  // Suggest mappings
  mapping += `## Suggested Field Mappings\n\n`;
  mapping += `Based on the fields found, here are the likely mappings:\n\n`;
  
  if (results.Clients?.fields) {
    mapping += `### Clients Table\n\n`;
    const clientFields = results.Clients.fields;
    
    // Try to find name field
    const nameField = clientFields.find(f => 
      f.toLowerCase().includes('name') || 
      f.toLowerCase().includes('client') ||
      f.toLowerCase().includes('full')
    ) || clientFields[0];
    
    // Try to find email field
    const emailField = clientFields.find(f => 
      f.toLowerCase().includes('email') || 
      f.toLowerCase().includes('mail')
    );
    
    // Try to find status field
    const statusField = clientFields.find(f => 
      f.toLowerCase().includes('status') || 
      f.toLowerCase().includes('stage') ||
      f.toLowerCase().includes('state')
    );
    
    mapping += `- **Name:** \`${nameField}\`\n`;
    if (emailField) mapping += `- **Email:** \`${emailField}\`\n`;
    if (statusField) mapping += `- **Status:** \`${statusField}\`\n`;
    mapping += `\n`;
  }
  
  fs.writeFileSync(mappingPath, mapping);
  console.log(`✅ Field mappings saved to: ${mappingPath}\n`);
}

main().catch(console.error);
