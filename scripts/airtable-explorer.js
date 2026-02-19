/**
 * Airtable Explorer Script
 * 
 * Lists all accessible bases and tables
 * Can create tables and fields if needed
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

if (!API_KEY) {
  console.error('❌ Missing AIRTABLE_API_KEY');
  console.log('Set it in xom3-app/.env.local');
  process.exit(1);
}

// Airtable API doesn't directly support listing bases, but we can try known base IDs
const KNOWN_BASES = [
  { id: 'app4y7GKkeUfZm8rS', name: 'Kairos CRM (USHA)' },
  { id: process.env.AIRTABLE_BASE_ID, name: 'Main Base' },
  { id: process.env.AIRTABLE_USHA_BASE_ID, name: 'USHA Base' }
].filter(b => b.id);

/**
 * Try to access a base and list its tables
 */
async function exploreBase(baseId, baseName) {
  try {
    const base = new Airtable({ apiKey: API_KEY }).base(baseId);
    
    // Try common table names to see what exists
    const commonTables = [
      'Clients', 'Interactions', 'Billing', 'Social Queue', 
      'Legacy Artifacts', 'Table 1', 'Clients Table', 'Client Records'
    ];
    
    const existingTables = [];
    const tableSchemas = {};
    
    for (const tableName of commonTables) {
      try {
        const records = await base(tableName).select({ maxRecords: 1 }).firstPage();
        existingTables.push(tableName);
        
        // Try to infer schema from first record
        if (records.length > 0) {
          tableSchemas[tableName] = Object.keys(records[0].fields);
        }
      } catch (e) {
        // Table doesn't exist or no access
      }
    }
    
    // Also try to get any table by trying generic names
    if (existingTables.length === 0) {
      // Try "Table 1" which is Airtable's default
      try {
        const records = await base("Table 1").select({ maxRecords: 1 }).firstPage();
        existingTables.push("Table 1");
        if (records.length > 0) {
          tableSchemas["Table 1"] = Object.keys(records[0].fields);
        }
      } catch (e) {
        // No default table
      }
    }
    
    return {
      baseId,
      baseName,
      accessible: true,
      tables: existingTables,
      schemas: tableSchemas
    };
  } catch (error) {
    return {
      baseId,
      baseName,
      accessible: false,
      error: error.message
    };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Exploring Airtable bases...\n');
  console.log(`🔑 Using API Key: ${API_KEY.substring(0, 10)}...\n`);
  
  const results = [];
  
  // Explore known bases
  for (const base of KNOWN_BASES) {
    if (!base.id) continue;
    console.log(`📦 Exploring ${base.name || base.id}...`);
    const result = await exploreBase(base.id, base.name);
    results.push(result);
    
    if (result.accessible) {
      console.log(`   ✅ Accessible`);
      console.log(`   📋 Tables: ${result.tables.length > 0 ? result.tables.join(', ') : 'None found'}`);
      if (Object.keys(result.schemas).length > 0) {
        console.log(`   📊 Sample fields:`);
        for (const [table, fields] of Object.entries(result.schemas)) {
          console.log(`      ${table}: ${fields.slice(0, 5).join(', ')}${fields.length > 5 ? '...' : ''}`);
        }
      }
    } else {
      console.log(`   ❌ Not accessible: ${result.error}`);
    }
    console.log('');
  }
  
  // Generate report
  const reportPath = path.join(__dirname, '../../AIRTABLE_EXPLORATION_REPORT.md');
  let report = `# Airtable Exploration Report\n\n`;
  report += `**Date:** ${new Date().toISOString()}\n`;
  report += `**API Key:** ${API_KEY.substring(0, 10)}...\n\n`;
  
  report += `## Bases Explored\n\n`;
  for (const result of results) {
    report += `### ${result.baseName || result.baseId}\n\n`;
    report += `- **Base ID:** \`${result.baseId}\`\n`;
    report += `- **Status:** ${result.accessible ? '✅ Accessible' : '❌ Not Accessible'}\n`;
    if (result.accessible) {
      report += `- **Tables Found:** ${result.tables.length}\n`;
      if (result.tables.length > 0) {
        report += `  - ${result.tables.join('\n  - ')}\n`;
      }
      if (Object.keys(result.schemas).length > 0) {
        report += `\n- **Table Schemas:**\n\n`;
        for (const [table, fields] of Object.entries(result.schemas)) {
          report += `  **${table}:**\n`;
          report += `  - Fields: ${fields.join(', ')}\n\n`;
        }
      }
    } else {
      report += `- **Error:** ${result.error}\n`;
    }
    report += `\n`;
  }
  
  // Recommendations
  report += `## Recommendations\n\n`;
  const accessibleBases = results.filter(r => r.accessible);
  if (accessibleBases.length > 0) {
    const mainBase = accessibleBases[0];
    report += `### Use Base: ${mainBase.baseName || mainBase.baseId}\n\n`;
    report += `This base is accessible and can be used for workflows.\n\n`;
    
    // Check if required tables exist
    const requiredTables = ['Clients', 'Interactions', 'Billing'];
    const missingTables = requiredTables.filter(t => !mainBase.tables.includes(t));
    
    if (missingTables.length > 0) {
      report += `### Missing Tables\n\n`;
      report += `The following tables need to be created:\n`;
      report += `- ${missingTables.join('\n- ')}\n\n`;
      report += `See \`AIRTABLE_WORKFLOW_SETUP.md\` for table schemas.\n\n`;
    } else {
      report += `### ✅ All Required Tables Exist\n\n`;
      report += `You're ready to set up workflows!\n\n`;
    }
  } else {
    report += `❌ No accessible bases found. Check your API key permissions.\n\n`;
  }
  
  fs.writeFileSync(reportPath, report);
  console.log(`✅ Report saved to: ${reportPath}\n`);
  
  // Summary
  const accessibleCount = results.filter(r => r.accessible).length;
  console.log('📊 Summary:');
  console.log(`   ✅ ${accessibleCount} accessible base(s)`);
  console.log(`   ❌ ${results.length - accessibleCount} inaccessible base(s)`);
  console.log(`\n💡 Check the report for details: ${reportPath}\n`);
}

main().catch(console.error);
