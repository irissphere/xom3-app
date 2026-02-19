/**
 * Airtable Workflow Setup Script
 * 
 * Sets up tables and creates API integration points for USHA Health workflows
 * Uses AIRTABLE_USHA_BASE_ID if set, otherwise falls back to AIRTABLE_BASE_ID.
 */

import Airtable from 'airtable';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from .env.local if it exists
try {
  const envPath = path.join(__dirname, '../../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    });
  }
} catch (e) {
  // Ignore if .env.local doesn't exist
}

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_USHA_BASE_ID || process.env.AIRTABLE_BASE_ID;

if (!API_KEY || !BASE_ID || BASE_ID.includes('YOUR_') || API_KEY.includes('your_')) {
  console.error('❌ Missing or invalid AIRTABLE_API_KEY or AIRTABLE_USHA_BASE_ID');
  console.log('\n📝 To set up:');
  console.log('1. Create xom3-app/.env.local file');
  console.log('2. Add these lines:');
  console.log('   AIRTABLE_API_KEY=your_personal_access_token_here');
  console.log('   AIRTABLE_USHA_BASE_ID=app_your_usha_base_here');
  console.log('   # (or set AIRTABLE_BASE_ID instead if you want to reuse your primary base)');
  console.log('\n💡 Get your API key from: https://airtable.com/api');
  console.log('   Base ID should be the Airtable base that contains the healthcare tables.\n');
  process.exit(1);
}

const base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);

// Table schemas based on airtable/schema.md
const TABLE_SCHEMAS = {
  'Clients': {
    fields: [
      { name: 'Name', type: 'singleLineText', options: { required: true } },
      { name: 'Email', type: 'email', options: { required: true } },
      { name: 'Phone', type: 'phoneNumber' },
      { name: 'Onboarding Status', type: 'singleSelect', options: { 
        choices: ['New', 'In Progress', 'Complete', 'On Hold'] 
      }},
      { name: 'Subscription Tier', type: 'singleSelect', options: { 
        choices: ['Free', 'Starter', 'Pro', 'Enterprise'] 
      }},
      { name: 'Status', type: 'singleSelect', options: { 
        choices: ['Prospect', 'Intake', 'Active', 'Compliance', 'Closed'] 
      }},
      { name: 'Created Date', type: 'date' },
      { name: 'Last Contact', type: 'date' },
      { name: 'Notes', type: 'multilineText' }
    ]
  },
  'Interactions': {
    fields: [
      { name: 'Client', type: 'multipleRecordLinks', options: { linkedTableId: 'Clients' } },
      { name: 'Date', type: 'dateTime', options: { required: true } },
      { name: 'Channel', type: 'singleSelect', options: { 
        choices: ['Slack', 'Email', 'Call', 'Meeting', 'SMS'] 
      }},
      { name: 'Type', type: 'singleSelect', options: { 
        choices: ['Inquiry', 'Support', 'Sales', 'Follow-up'] 
      }},
      { name: 'Notes', type: 'multilineText', options: { required: true } },
      { name: 'Outcome', type: 'singleSelect', options: { 
        choices: ['Resolved', 'Pending', 'Escalated', 'Closed'] 
      }}
    ]
  },
  'Billing': {
    fields: [
      { name: 'Invoice ID', type: 'singleLineText', options: { required: true, unique: true } },
      { name: 'Client', type: 'multipleRecordLinks', options: { linkedTableId: 'Clients' } },
      { name: 'Amount', type: 'currency', options: { required: true } },
      { name: 'Status', type: 'singleSelect', options: { 
        choices: ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'] 
      }},
      { name: 'Due Date', type: 'date', options: { required: true } },
      { name: 'Paid Date', type: 'date' },
      { name: 'Stripe Link', type: 'url' },
      { name: 'Stripe Customer ID', type: 'singleLineText' },
      { name: 'Notes', type: 'multilineText' },
      { name: 'Tenant', type: 'singleLineText' }
    ]
  },
  'Social Queue': {
    fields: [
      { name: 'Platform', type: 'singleSelect', options: { 
        choices: ['Twitter/X', 'Instagram', 'YouTube', 'TikTok', 'LinkedIn', 'Facebook'] 
      }},
      { name: 'Content', type: 'multilineText', options: { required: true } },
      { name: 'Media URL', type: 'multipleAttachments' },
      { name: 'Scheduled Date', type: 'dateTime', options: { required: true } },
      { name: 'Status', type: 'singleSelect', options: { 
        choices: ['Draft', 'Scheduled', 'Published', 'Failed'] 
      }},
      { name: 'Published Date', type: 'dateTime' },
      { name: 'Engagement', type: 'number' },
      { name: 'Link', type: 'url' }
    ]
  }
};

/**
 * Check if table exists and has required fields
 */
async function checkTable(tableName, schema) {
  try {
    const records = await base(tableName).select({ maxRecords: 1 }).firstPage();
    console.log(`✅ Table "${tableName}" exists`);
    
    // Try to get table schema (Airtable API doesn't expose this directly)
    // We'll just verify we can read from it
    return true;
  } catch (error) {
    if (error.message.includes('Could not find table')) {
      console.log(`❌ Table "${tableName}" does not exist`);
      return false;
    }
    throw error;
  }
}

/**
 * Verify table structure by trying to create a test record
 */
async function verifyTableStructure(tableName, schema) {
  try {
    // Create a minimal test record to verify fields exist
    const testFields = {};
    for (const field of schema.fields) {
      if (field.type === 'singleLineText' || field.type === 'email') {
        testFields[field.name] = 'TEST';
        break; // Just test one field
      }
    }
    
    if (Object.keys(testFields).length > 0) {
      const testRecord = await base(tableName).create(testFields);
      // Delete test record
      await base(tableName).destroy(testRecord.id);
      return true;
    }
    return true;
  } catch (error) {
    console.warn(`⚠️  Table "${tableName}" may be missing some fields: ${error.message}`);
    return false;
  }
}

/**
 * Main setup function
 */
async function setup() {
  console.log('🚀 Setting up Airtable workflows for USHA Health\n');
  console.log(`📦 Base ID: ${BASE_ID}\n`);
  
  // Check each table
  const results = {};
  for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
    console.log(`Checking "${tableName}"...`);
    const exists = await checkTable(tableName, schema);
    if (exists) {
      await verifyTableStructure(tableName, schema);
      results[tableName] = 'exists';
    } else {
      console.log(`   ⚠️  Table needs to be created manually in Airtable`);
      console.log(`   Required fields:`);
      schema.fields.forEach(f => {
        console.log(`     - ${f.name} (${f.type})`);
      });
      results[tableName] = 'missing';
    }
    console.log('');
  }
  
  // Generate setup instructions
  const instructions = {
    baseId: BASE_ID,
    tables: results,
    webhookEndpoints: [
      {
        name: 'Lead Intake',
        url: 'http://localhost:3000/api/usha/webhooks/lead-intake',
        method: 'POST',
        description: 'Receives new leads and creates client records'
      },
      {
        name: 'Billing Webhook',
        url: 'http://localhost:3000/api/usha/webhooks/billing',
        method: 'POST',
        description: 'Receives Stripe/PayPal webhooks and updates billing records'
      },
      {
        name: 'Interaction Logger',
        url: 'http://localhost:3000/api/usha/webhooks/interaction',
        method: 'POST',
        description: 'Logs client interactions from Slack, Email, etc.'
      }
    ],
    n8nWorkflows: [
      {
        name: 'Lane 2: CRM & Onboarding',
        file: 'flows/lane2-crm-onboarding.json',
        webhook: '/api/usha/webhooks/lead-intake',
        description: 'Lead intake and client management'
      },
      {
        name: 'Lane 3: Billing & Monetization',
        file: 'flows/lane3-billing-monetization.json',
        webhook: '/api/usha/webhooks/billing',
        description: 'Stripe/PayPal payment processing'
      }
    ]
  };
  
  // Save instructions
  const outputPath = path.join(__dirname, '../../AIRTABLE_SETUP_COMPLETE.md');
  let output = `# Airtable Workflow Setup Complete\n\n`;
  output += `**Base ID:** ${BASE_ID}\n`;
  output += `**Date:** ${new Date().toISOString()}\n\n`;
  output += `## Table Status\n\n`;
  for (const [table, status] of Object.entries(results)) {
    output += `- **${table}**: ${status === 'exists' ? '✅ Exists' : '❌ Needs Creation'}\n`;
  }
  output += `\n## Webhook Endpoints\n\n`;
  instructions.webhookEndpoints.forEach(ep => {
    output += `### ${ep.name}\n`;
    output += `- **URL:** \`${ep.url}\`\n`;
    output += `- **Method:** ${ep.method}\n`;
    output += `- **Description:** ${ep.description}\n\n`;
  });
  output += `## Next Steps\n\n`;
  output += `1. Ensure all tables exist in Airtable (create manually if needed)\n`;
  output += `2. Import n8n workflows from \`flows/\` directory\n`;
  output += `3. Configure webhook URLs in n8n workflows\n`;
  output += `4. Test webhook endpoints\n`;
  output += `5. Access healthcare dashboard at http://localhost:3000/app/healthcare\n`;
  
  fs.writeFileSync(outputPath, output);
  console.log(`✅ Setup instructions saved to: ${outputPath}\n`);
  
  // Summary
  const existingCount = Object.values(results).filter(r => r === 'exists').length;
  const missingCount = Object.values(results).filter(r => r === 'missing').length;
  
  console.log('📊 Summary:');
  console.log(`   ✅ ${existingCount} tables exist`);
  console.log(`   ❌ ${missingCount} tables need creation`);
  console.log(`\n💡 Next: Create missing tables in Airtable, then import n8n workflows\n`);
}

setup().catch(console.error);
