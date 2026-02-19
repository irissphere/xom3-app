/**
 * XOM3 Privacy-Compliant Data Tracker
 * Embeddable JavaScript for website data collection with consent management
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    apiBase: window.XOM3_CONFIG?.apiBase || 'https://your-domain.com',
    domain: window.XOM3_CONFIG?.domain || 'benefitscrm',
    consentRequired: window.XOM3_CONFIG?.consentRequired !== false,
    autoTrack: window.XOM3_CONFIG?.autoTrack !== false
  };

  // Core tracker class
  class XOM3Tracker {
    constructor() {
      this.visitorId = this.getOrCreateVisitorId();
      this.consent = this.loadConsent();
      this.queue = [];
      this.initialized = false;
    }

    // Initialize tracker
    async init() {
      if (this.initialized) return;
      this.initialized = true;

      // Set up automatic tracking if enabled
      if (CONFIG.autoTrack) {
        this.setupAutoTracking();
      }

      // Process any queued events
      this.processQueue();

      console.log('XOM3 Tracker initialized for domain:', CONFIG.domain);
    }

    // Generate or retrieve visitor ID
    getOrCreateVisitorId() {
      let visitorId = localStorage.getItem('xom3_visitor_id');
      if (!visitorId) {
        visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('xom3_visitor_id', visitorId);
      }
      return visitorId;
    }

    // Load saved consent preferences
    loadConsent() {
      try {
        const saved = localStorage.getItem('xom3_consent');
        return saved ? JSON.parse(saved) : null;
      } catch (e) {
        return null;
      }
    }

    // Update consent preferences
    async updateConsent(categories) {
      this.consent = {
        granted: categories,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      localStorage.setItem('xom3_consent', JSON.stringify(this.consent));

      // Send consent update to server
      await this.sendToServer('/api/xom3/consent', {
        profileId: this.visitorId,
        domain: CONFIG.domain,
        visitorId: this.visitorId,
        consentCategories: categories,
        jurisdiction: this.detectJurisdiction()
      });

      // Emit consent signal
      this.emitSignal('consent-updated', {
        categories,
        timestamp: this.consent.timestamp
      });
    }

    // Check if consent is granted for specific categories
    hasConsent(categories = []) {
      if (!CONFIG.consentRequired) return true;
      if (!this.consent) return false;

      return categories.every(cat => this.consent.granted.includes(cat));
    }

    // Track data event
    async track(dataType, payload, requiredConsent = []) {
      if (CONFIG.consentRequired && !this.hasConsent(requiredConsent)) {
        console.log('Data tracking blocked - consent not granted for:', requiredConsent);
        return false;
      }

      const event = {
        domain: CONFIG.domain,
        visitorId: this.visitorId,
        dataType,
        payload,
        source: 'website',
        timestamp: new Date().toISOString()
      };

      if (!this.initialized) {
        this.queue.push(event);
        return;
      }

      return await this.sendData(event);
    }

    // Send data to XOM3 API
    async sendData(event) {
      try {
        const response = await fetch(`${CONFIG.apiBase}/api/capture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event)
        });

        const result = await response.json();

        if (result.success) {
          this.emitSignal('data-sent', {
            dataType: event.dataType,
            dataId: result.dataId
          });
          return true;
        } else {
          console.error('Data capture failed:', result.error);
          return false;
        }
      } catch (error) {
        console.error('Data capture error:', error);
        return false;
      }
    }

    // Set up automatic tracking
    setupAutoTracking() {
      // Page view tracking
      this.trackPageView();

      // Click tracking (on interactive elements)
      document.addEventListener('click', (e) => {
        const target = e.target;
        if (target.matches('a, button, [data-track]')) {
          this.track('behavior', {
            type: 'click',
            element: target.tagName.toLowerCase(),
            text: target.textContent?.trim().substring(0, 50),
            href: target.href,
            path: window.location.pathname
          }, ['analytics']);
        }
      });

      // Form interaction tracking
      document.addEventListener('submit', (e) => {
        const form = e.target;
        if (form.matches('form[data-track]')) {
          this.track('conversion', {
            type: 'form_submit',
            formId: form.id || 'unknown',
            fields: Array.from(form.elements).map(el => ({
              name: el.name,
              type: el.type,
              required: el.required
            })).filter(f => f.name)
          }, ['analytics', 'marketing']);
        }
      });

      // Scroll depth tracking
      let maxScroll = 0;
      window.addEventListener('scroll', () => {
        const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
        if (scrollPercent > maxScroll && scrollPercent % 25 === 0) {
          maxScroll = scrollPercent;
          this.track('behavior', {
            type: 'scroll',
            depth: scrollPercent,
            path: window.location.pathname
          }, ['analytics']);
        }
      });
    }

    // Track page views
    trackPageView() {
      this.track('behavior', {
        type: 'page_view',
        path: window.location.pathname,
        referrer: document.referrer,
        title: document.title,
        timestamp: new Date().toISOString()
      }, ['analytics']);
    }

    // Track intent signals
    trackIntent(intentType, details) {
      this.track('intent', {
        type: intentType,
        details,
        context: {
          page: window.location.pathname,
          timeOnPage: this.getTimeOnPage()
        }
      }, ['analytics', 'marketing']);
    }

    // Get time spent on page
    getTimeOnPage() {
      const startTime = window.performance.timing.navigationStart;
      return Date.now() - startTime;
    }

    // Process queued events
    processQueue() {
      while (this.queue.length > 0) {
        const event = this.queue.shift();
        this.sendData(event);
      }
    }

    // Detect user jurisdiction (basic)
    detectJurisdiction() {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone.includes('Europe')) return 'EU';
      if (timezone.includes('America')) return 'US';
      return 'UNKNOWN';
    }

    // Send data to server (generic method)
    async sendToServer(endpoint, data) {
      try {
        const response = await fetch(`${CONFIG.apiBase}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        return await response.json();
      } catch (error) {
        console.error('Server request failed:', error);
        return null;
      }
    }

    // Emit custom events for external listeners
    emitSignal(type, data) {
      const event = new CustomEvent('xom3:' + type, {
        detail: data
      });
      window.dispatchEvent(event);
    }
  }

  // Global tracker instance
  const tracker = new XOM3Tracker();

  // Public API
  window.XOM3 = {
    init: () => tracker.init(),
    updateConsent: (categories) => tracker.updateConsent(categories),
    hasConsent: (categories) => tracker.hasConsent(categories),
    track: (dataType, payload, consent) => tracker.track(dataType, payload, consent),
    trackIntent: (type, details) => tracker.trackIntent(type, details),
    getVisitorId: () => tracker.visitorId,
    getConsent: () => tracker.consent
  };

  // Auto-initialize if not disabled
  if (!window.XOM3_CONFIG?.manualInit) {
    // Wait for DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => tracker.init());
    } else {
      tracker.init();
    }
  }

})();








