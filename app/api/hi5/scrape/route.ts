import { NextResponse } from "next/server";
import { runHI5LeadDiscovery } from "@/lib/hi5/scraper-orchestrator";
import { createGoldenLead } from "@/lib/system/hi5-golden-path-store";
import { getTenantKey } from "@/lib/system/tenant";
import { HI5_ENABLED } from "@/lib/system/hi5-feature";

export async function POST(req: Request) {
  if (!HI5_ENABLED) {
    return NextResponse.json({ ok: false, error: "hi5_disabled" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const tenant = body?.tenant || getTenantKey();

    console.log(`[HI5 API] Starting lead discovery for tenant: ${tenant}`);

    // Run comprehensive scraping
    const { results, summary } = await runHI5LeadDiscovery({
      keywords: body?.keywords || [
        'VoIP', 'Internet', 'Fiber', 'Network', 'Cyber Security', 'WiFi',
        'Telecommunications', 'Unified Communications', 'Cloud Services'
      ],
      location: body?.location || 'Texas',
      enabledSources: {
        linkedin: body?.sources?.linkedin !== false,
        twitter: body?.sources?.twitter !== false,
        instagram: body?.sources?.instagram !== false,
        rfpBoards: body?.sources?.rfpBoards !== false,
        jobBoards: body?.sources?.jobBoards !== false,
        newsSources: body?.sources?.newsSources !== false,
      },
      maxResultsPerSource: body?.maxResults || 10
    });

    // Process and store leads
    const processedLeads = [];
    const errors = [];

    for (const result of results) {
      for (const lead of result.leads) {
        try {
          // Create golden lead record
          const goldenLead = createGoldenLead(tenant, {
            name: lead.contact,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            message: lead.message,
            source: lead.source,
            // Additional HI5-specific data
            hi5Data: {
              title: lead.title,
              industry: lead.industry,
              companySize: lead.companySize,
              location: lead.location,
              services: lead.services,
              qualificationScore: lead.qualificationScore,
              dealValue: lead.dealValue,
              tags: lead.tags,
              sourceUrl: lead.sourceUrl,
              rfpReference: lead.rfpReference
            }
          });

          processedLeads.push({
            id: goldenLead.id,
            source: result.platform,
            qualificationScore: lead.qualificationScore,
            dealValue: lead.dealValue
          });

        } catch (error) {
          console.error(`[HI5 API] Error processing lead ${lead.id}:`, error);
          errors.push(`Failed to process lead ${lead.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    console.log(`[HI5 API] Completed lead discovery: ${processedLeads.length} leads processed, ${summary.totalPosts} posts found, ${summary.totalRFPs} RFPs discovered`);

    return NextResponse.json({
      ok: true,
      tenant,
      summary: {
        totalLeads: summary.totalLeads,
        totalPosts: summary.totalPosts,
        totalRFPs: summary.totalRFPs,
        leadsBySource: summary.leadsBySource,
        topKeywords: summary.topKeywords,
        processedLeads: processedLeads.length,
        scrapingErrors: summary.errors.length
      },
      results: results.map(r => ({
        platform: r.platform,
        leadsCount: r.leads.length,
        postsCount: r.posts?.length || 0,
        rfpsCount: r.rfps?.length || 0,
        scrapedAt: r.scrapedAt,
        error: r.error
      })),
      errors: [...summary.errors, ...errors],
      scrapedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[HI5 API] Scraping failed:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Scraping failed',
      scrapedAt: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint for testing/status
export async function GET() {
  if (!HI5_ENABLED) {
    return NextResponse.json({ ok: false, error: "hi5_disabled" }, { status: 403 });
  }

  // Return scraping status/configuration
  return NextResponse.json({
    ok: true,
    status: 'ready',
    sources: {
      linkedin: !!process.env.LINKEDIN_ACCESS_TOKEN,
      twitter: !!process.env.TWITTER_BEARER_TOKEN,
      instagram: !!process.env.INSTAGRAM_ACCESS_TOKEN,
      rfpBoards: true // Always available (web scraping)
    },
    config: {
      keywords: [
        'VoIP', 'Internet', 'Fiber', 'Network', 'Cyber Security', 'WiFi',
        'Telecommunications', 'Unified Communications', 'Cloud Services'
      ],
      location: 'Texas',
      maxResultsPerSource: 10
    }
  });
}


