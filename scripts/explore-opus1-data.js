/**
 * Explore Opus 1 Data Structure
 * 
 * Lists all tables and their data to understand what follow-ups and information exists
 */

import Airtable from 'airtable';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
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
  // Ignore
}

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = 'app4y7GKkeUfZm8rS'; // Kairos CRM / Opus 1

if (!API_KEY) {
  console.error('❌ Missing AIRTABLE_API_KEY');
  process.exit(1);
}

const base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);

async function exploreTable(tableName) {
  try {
    const records = await base(tableName).select({ maxRecords: 50 }).all();
    
    const allFields = new Set();
    records.forEach(r => {
      Object.keys(r.fields).forEach(f => allFields.add(f));
    });
    
    return {
      exists: true,
      recordCount: records.length,
      fields: Array.from(allFields),
      sampleRecords: records.slice(0, 5).map(r => ({
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
  console.log('🔍 Exploring Opus 1 Data Structure\n');
  console.log(`📦 Base: ${BASE_ID}\n`);
  
  // Try common table names that might have follow-ups
  const tablesToCheck = [
    'Clients',
    'Interactions', 
    'Follow-ups',
    'Follow Ups',
    'FollowUps',
    'Tasks',
    'Reminders',
    'Notes',
    'Activities',
    'Billing',
    'Appointments',
    'Calls',
    'Emails'
  ];
  
  const results = {};
  
  for (const tableName of tablesToCheck) {
    const result = await exploreTable(tableName);
    if (result.exists) {
      results[tableName] = result;
      console.log(`📋 ${tableName}`);
      console.log(`   ✅ ${result.recordCount} records`);
      console.log(`   📝 Fields: ${result.fields.join(', ')}`);
      if (result.sampleRecords.length > 0) {
        console.log(`   📄 Sample record:`);
        const sample = result.sampleRecords[0];
        Object.entries(sample.fields).slice(0, 5).forEach(([key, value]) => {
          const displayValue = typeof value === 'string' && value.length > 50 
            ? value.substring(0, 50) + '...' 
            : Array.isArray(value) 
            ? `[${value.length} items]`
            : value;
          console.log(`      ${key}: ${displayValue}`);
        });
      }
      console.log('');
    }
  }
  
  // Generate data structure report
  const reportPath = path.join(__dirname, '../../OPUS1_DATA_STRUCTURE.md');
  let report = `# Opus 1 Data Structure\n\n`;
  report += `**Base ID:** ${BASE_ID}\n`;
  report += `**Date:** ${new Date().toISOString()}\n\n`;
  
  report += `## Tables Found\n\n`;
  for (const [table, result] of Object.entries(results)) {
    report += `### ${table}\n\n`;
    report += `- **Records:** ${result.recordCount}\n`;
    report += `- **Fields:**\n`;
    result.fields.forEach(f => {
      report += `  - \`${f}\`\n`;
    });
    report += `\n`;
  }
  
  // Identify follow-up related fields
  report += `## Follow-up Related Fields\n\n`;
  const followUpFields = [];
  for (const [table, result] of Object.entries(results)) {
    result.fields.forEach(field => {
      const lower = field.toLowerCase();
      if (lower.includes('follow') || lower.includes('reminder') || 
          lower.includes('due') || lower.includes('next') ||
          lower.includes('task') || lower.includes('action')) {
        followUpFields.push({ table, field });
      }
    });
  }
  
  if (followUpFields.length > 0) {
    followUpFields.forEach(({ table, field }) => {
      report += `- **${table}.**\`${field}\`\n`;
    });
  } else {
    report += `No explicit follow-up fields found. Check Interactions or Tasks tables.\n`;
  }
  
  fs.writeFileSync(reportPath, report);
  console.log(`✅ Report saved to: ${reportPath}\n`);
}

main().catch(console.error);
