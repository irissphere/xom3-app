# XOM3 Consent Management System - Complete Implementation

## Overview
A privacy-compliant data collection system for capturing user data from websites while maintaining legal compliance. Designed for the XOM3 cockpit architecture.

## Components Created

### 1. Core System (`lib/xom3/`)
- **Types** (`types.ts`) - TypeScript interfaces for consent profiles, data flow, and signals
- **Consent Manager** (`consent-manager.ts`) - Core consent management logic
- **Consent Validator** (`consent-validator.ts`) - Consent validation and jurisdiction detection
- **Data Flow Processor** (`data-flow-processor.ts`) - Data normalization and routing
- **Signal Emitter** (`signal-emitter.ts`) - Event signaling system

### 2. API Endpoints
- **`/api/xom3/consent`** - Consent profile management
- **`/api/xom3/consent/analytics`** - Consent analytics dashboard
- **`/api/capture`** - Data capture endpoint for websites
- **`/api/signals/consent`** - Consent signal processing
- **`/api/signals/data-flow`** - Data flow signal processing

### 3. Cockpit Panel
- **ConsentManagementPanel** (`app/xom3/ui/panels/`) - Real-time consent dashboard

### 4. Website Integration
- **Tracker Script** (`public/xom3-tracker.js`) - Embeddable JavaScript for data collection
- **Consent Banner** (`public/xom3-consent-banner.js`) - Privacy-compliant consent UI

## Installation for Websites

### Basic Setup
```html
<!-- Load tracker and banner -->
<script src="https://your-domain.com/xom3-tracker.js"></script>
<script src="https://your-domain.com/xom3-consent-banner.js"></script>

<!-- Configure (optional) -->
<script>
  window.XOM3_CONFIG = {
    domain: 'benefitscrm', // or 'healthcrm', 'commerce', 'broadcast'
    apiBase: 'https://your-domain.com'
  };
</script>
```

### Advanced Configuration
```html
<script>
  window.XOM3_CONFIG = {
    domain: 'benefitscrm',
    apiBase: 'https://your-domain.com',
    consentRequired: true,
    autoTrack: true
  };

  window.XOM3_BANNER_CONFIG = {
    theme: 'dark', // or 'light'
    position: 'bottom', // or 'top'
    texts: {
      title: 'We Value Your Privacy',
      description: 'Help us improve your experience...'
    }
  };
</script>
```

## Usage Examples

### Manual Data Tracking
```javascript
// Track page interactions
XOM3.track('behavior', {
  type: 'button_click',
  buttonId: 'get-quote',
  page: '/benefits'
}, ['analytics']);

// Track user intent
XOM3.trackIntent('benefit_interest', {
  benefitType: 'ACA',
  income: 45000
});

// Check consent status
if (XOM3.hasConsent(['marketing'])) {
  // Show personalized content
}
```

### Consent Management
```javascript
// Update consent programmatically
XOM3.updateConsent(['essential', 'analytics', 'marketing']);

// Listen for consent events
window.addEventListener('xom3:consent-updated', (event) => {
  console.log('Consent updated:', event.detail);
});
```

## Data Flow Architecture

### Signal Flow
```
Website → Tracker → /api/capture → Data Flow Processor → Lane Routing
                              ↓
                        Consent Validator → Signal Emission
```

### Lane Routing
- **Intent Data** → Intake & Triage Lane
- **Behavior Data** → Follow-ups & Tasks Lane
- **Conversion Data** → Eligibility & Enrollment Lane
- **Enrichment Data** → Workflow Automation Lane

## Legal Compliance Features

### Jurisdiction Detection
- **EU**: Strict consent requirements (GDPR)
- **US**: State-specific variations (CCPA, etc.)
- **APAC**: Varying requirements by country

### Data Handling
- **Consent Validation**: All data collection requires consent
- **Data Anonymization**: Automatic anonymization when consent is denied
- **Retention Policies**: Configurable data retention periods
- **Audit Trail**: Complete logging of consent and data events

## Dashboard Features

### Real-time Metrics
- Total visitors and consent rates
- Category breakdown (essential, analytics, marketing, functional)
- Jurisdiction compliance status
- Active profile counts

### Management Actions
- Export consent reports
- Cleanup expired profiles
- Update privacy policies
- Audit compliance

## Integration Points

### XOM3 Cockpit
- Consent panel integrates with existing cockpit UI
- Signals feed into UOI (Unified Operational Intelligence)
- Data flows into domain-specific lanes

### External Systems
- Airtable integration for profile storage
- n8n workflows for automation
- Signal processing for real-time responses

## Security Considerations

### Data Protection
- No personal data stored without consent
- Automatic data anonymization
- Secure API endpoints with validation
- Audit logging for compliance

### Privacy by Design
- Minimal data collection by default
- Granular consent categories
- Easy consent revocation
- Transparent data usage

## Next Steps

1. **Deploy API endpoints** to production
2. **Configure domain-specific routing** in data flow processor
3. **Set up n8n workflows** for lane automation
4. **Create privacy policy templates** for different jurisdictions
5. **Implement data retention cleanup** jobs
6. **Add A/B testing** for consent banner optimization

## Files Created/Modified
- `lib/xom3/types.ts` - Type definitions
- `lib/xom3/consent-manager.ts` - Consent management logic
- `lib/xom3/consent-validator.ts` - Validation utilities
- `lib/xom3/data-flow-processor.ts` - Data processing pipeline
- `lib/xom3/signal-emitter.ts` - Event signaling
- `lib/xom3/index.ts` - Module exports
- `app/xom3/ui/panels/ConsentManagementPanel.tsx` - Dashboard panel
- `app/api/xom3/consent/route.ts` - Consent API
- `app/api/xom3/consent/analytics/route.ts` - Analytics API
- `app/api/capture/route.ts` - Data capture endpoint
- `app/api/signals/consent/route.ts` - Consent signals
- `app/api/signals/data-flow/route.ts` - Data flow signals
- `public/xom3-tracker.js` - Website tracking script
- `public/xom3-consent-banner.js` - Consent banner UI

This implementation provides a complete, privacy-compliant data collection system that pushes legal boundaries while maintaining compliance across jurisdictions.








