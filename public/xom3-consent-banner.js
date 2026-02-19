/**
 * XOM3 Consent Banner Component
 * Privacy-compliant consent management UI
 */

(function() {
  'use strict';

  // Configuration
  const BANNER_CONFIG = {
    theme: window.XOM3_BANNER_CONFIG?.theme || 'dark',
    position: window.XOM3_BANNER_CONFIG?.position || 'bottom',
    categories: window.XOM3_BANNER_CONFIG?.categories || [
      { id: 'essential', name: 'Essential Cookies', description: 'Required for website functionality', required: true },
      { id: 'analytics', name: 'Analytics', description: 'Help us improve our website', required: false },
      { id: 'marketing', name: 'Marketing', description: 'Personalized content and ads', required: false },
      { id: 'functional', name: 'Functional', description: 'Remember your preferences', required: false }
    ],
    texts: {
      title: window.XOM3_BANNER_CONFIG?.texts?.title || 'Privacy & Cookies',
      description: window.XOM3_BANNER_CONFIG?.texts?.description || 'We use cookies to enhance your experience and provide personalized content.',
      acceptAll: window.XOM3_BANNER_CONFIG?.texts?.acceptAll || 'Accept All',
      rejectAll: window.XOM3_BANNER_CONFIG?.texts?.rejectAll || 'Reject All',
      customize: window.XOM3_BANNER_CONFIG?.texts?.customize || 'Customize',
      save: window.XOM3_BANNER_CONFIG?.texts?.save || 'Save Preferences',
      ...window.XOM3_BANNER_CONFIG?.texts
    }
  };

  class ConsentBanner {
    constructor() {
      this.banner = null;
      this.overlay = null;
      this.preferences = null;
      this.isVisible = false;
      this.hasConsent = this.checkExistingConsent();
    }

    // Initialize banner
    init() {
      if (this.hasConsent) return;

      this.createBanner();
      this.attachEvents();
      this.show();
    }

    // Check if user already has consent
    checkExistingConsent() {
      return !!localStorage.getItem('xom3_consent');
    }

    // Create banner HTML
    createBanner() {
      const banner = document.createElement('div');
      banner.id = 'xom3-consent-banner';
      banner.className = `xom3-consent-banner xom3-theme-${BANNER_CONFIG.theme} xom3-position-${BANNER_CONFIG.position}`;

      banner.innerHTML = `
        <div class="xom3-banner-content">
          <div class="xom3-banner-text">
            <h3 class="xom3-banner-title">${BANNER_CONFIG.texts.title}</h3>
            <p class="xom3-banner-description">${BANNER_CONFIG.texts.description}</p>
          </div>
          <div class="xom3-banner-actions">
            <button class="xom3-btn xom3-btn-secondary" data-action="customize">${BANNER_CONFIG.texts.customize}</button>
            <button class="xom3-btn xom3-btn-primary" data-action="accept-all">${BANNER_CONFIG.texts.acceptAll}</button>
          </div>
        </div>
      `;

      // Add overlay
      const overlay = document.createElement('div');
      overlay.id = 'xom3-consent-overlay';
      overlay.className = 'xom3-consent-overlay';

      document.body.appendChild(overlay);
      document.body.appendChild(banner);

      this.banner = banner;
      this.overlay = overlay;
    }

    // Create preferences modal
    createPreferencesModal() {
      const modal = document.createElement('div');
      modal.id = 'xom3-preferences-modal';
      modal.className = 'xom3-preferences-modal';

      modal.innerHTML = `
        <div class="xom3-modal-overlay" data-action="close"></div>
        <div class="xom3-modal-content">
          <div class="xom3-modal-header">
            <h2>Cookie Preferences</h2>
            <button class="xom3-modal-close" data-action="close">&times;</button>
          </div>
          <div class="xom3-modal-body">
            <p>We use different types of cookies and tracking technologies to improve your experience on our website.</p>
            <div class="xom3-categories">
              ${BANNER_CONFIG.categories.map(cat => `
                <div class="xom3-category">
                  <div class="xom3-category-header">
                    <label class="xom3-category-toggle">
                      <input type="checkbox" ${cat.required ? 'checked disabled' : ''} data-category="${cat.id}">
                      <span class="xom3-toggle-slider"></span>
                    </label>
                    <div class="xom3-category-info">
                      <h4>${cat.name}</h4>
                      <p>${cat.description}</p>
                      ${cat.required ? '<span class="xom3-required">Required</span>' : ''}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="xom3-modal-footer">
            <button class="xom3-btn xom3-btn-secondary" data-action="reject-all">${BANNER_CONFIG.texts.rejectAll}</button>
            <button class="xom3-btn xom3-btn-primary" data-action="save">${BANNER_CONFIG.texts.save}</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      this.preferences = modal;

      // Load existing preferences
      this.loadPreferences();
    }

    // Load existing preferences into modal
    loadPreferences() {
      if (!window.XOM3?.getConsent()) return;

      const consent = window.XOM3.getConsent();
      consent.granted.forEach(categoryId => {
        const checkbox = this.preferences.querySelector(`[data-category="${categoryId}"]`);
        if (checkbox && !checkbox.disabled) {
          checkbox.checked = true;
        }
      });
    }

    // Attach event listeners
    attachEvents() {
      // Banner actions
      this.banner.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action === 'accept-all') this.acceptAll();
        if (action === 'customize') this.showPreferences();
      });

      // Preferences modal actions
      document.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action === 'close' && this.preferences) this.hidePreferences();
        if (action === 'reject-all') this.rejectAll();
        if (action === 'save') this.savePreferences();
      });
    }

    // Accept all categories
    async acceptAll() {
      const allCategories = BANNER_CONFIG.categories.map(cat => cat.id);
      await this.setConsent(allCategories);
    }

    // Reject all non-required categories
    async rejectAll() {
      const requiredCategories = BANNER_CONFIG.categories
        .filter(cat => cat.required)
        .map(cat => cat.id);
      await this.setConsent(requiredCategories);
    }

    // Save custom preferences
    async savePreferences() {
      const checkedBoxes = this.preferences.querySelectorAll('input[data-category]:checked:not(:disabled)');
      const selectedCategories = Array.from(checkedBoxes).map(cb => cb.dataset.category);
      await this.setConsent(selectedCategories);
      this.hidePreferences();
    }

    // Set consent and update tracker
    async setConsent(categories) {
      if (window.XOM3) {
        await window.XOM3.updateConsent(categories);
      }

      this.hide();
      this.hasConsent = true;
    }

    // Show banner
    show() {
      if (this.isVisible) return;
      this.banner.style.display = 'block';
      this.overlay.style.display = 'block';
      this.isVisible = true;
    }

    // Hide banner
    hide() {
      if (!this.isVisible) return;
      this.banner.style.display = 'none';
      this.overlay.style.display = 'none';
      this.isVisible = false;
    }

    // Show preferences modal
    showPreferences() {
      if (!this.preferences) {
        this.createPreferencesModal();
      }
      this.preferences.style.display = 'block';
    }

    // Hide preferences modal
    hidePreferences() {
      if (this.preferences) {
        this.preferences.style.display = 'none';
      }
    }
  }

  // Add CSS styles
  const styles = `
    /* Consent Banner Styles */
    .xom3-consent-banner {
      position: fixed;
      z-index: 999999;
      width: 100%;
      box-shadow: 0 -2px 20px rgba(0,0,0,0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .xom3-position-bottom {
      bottom: 0;
      left: 0;
    }

    .xom3-position-top {
      top: 0;
      left: 0;
    }

    .xom3-theme-dark .xom3-banner-content {
      background: #1a1a1a;
      color: #ffffff;
      padding: 20px;
    }

    .xom3-theme-light .xom3-banner-content {
      background: #ffffff;
      color: #333333;
      padding: 20px;
      border-top: 1px solid #e0e0e0;
    }

    .xom3-banner-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1200px;
      margin: 0 auto;
    }

    .xom3-banner-text {
      flex: 1;
      margin-right: 20px;
    }

    .xom3-banner-title {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
    }

    .xom3-banner-description {
      margin: 0;
      font-size: 14px;
      opacity: 0.8;
    }

    .xom3-banner-actions {
      display: flex;
      gap: 12px;
    }

    .xom3-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .xom3-btn-primary {
      background: #007bff;
      color: white;
    }

    .xom3-btn-primary:hover {
      background: #0056b3;
    }

    .xom3-btn-secondary {
      background: transparent;
      border: 1px solid #ccc;
      color: inherit;
    }

    .xom3-btn-secondary:hover {
      background: rgba(255,255,255,0.1);
    }

    /* Modal Styles */
    .xom3-preferences-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000000;
      display: none;
    }

    .xom3-modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
    }

    .xom3-modal-content {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 8px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }

    .xom3-modal-header {
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .xom3-modal-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }

    .xom3-modal-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
    }

    .xom3-modal-body {
      padding: 20px;
    }

    .xom3-modal-footer {
      padding: 20px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .xom3-categories {
      margin-top: 20px;
    }

    .xom3-category {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      margin-bottom: 12px;
    }

    .xom3-category-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
    }

    .xom3-category-toggle {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }

    .xom3-category-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .xom3-toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 24px;
    }

    .xom3-toggle-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }

    input:checked + .xom3-toggle-slider {
      background-color: #007bff;
    }

    input:checked + .xom3-toggle-slider:before {
      transform: translateX(20px);
    }

    .xom3-category-info h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
    }

    .xom3-category-info p {
      margin: 0;
      font-size: 14px;
      color: #666;
    }

    .xom3-required {
      display: inline-block;
      background: #dc3545;
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      margin-left: 8px;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .xom3-banner-content {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .xom3-banner-text {
        margin-right: 0;
      }

      .xom3-banner-actions {
        justify-content: center;
      }
    }
  `;

  // Inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Initialize banner
  const banner = new ConsentBanner();

  // Public API
  window.XOM3Banner = {
    init: () => banner.init(),
    show: () => banner.show(),
    hide: () => banner.hide(),
    showPreferences: () => banner.showPreferences()
  };

  // Auto-initialize
  if (!window.XOM3_BANNER_CONFIG?.manualInit) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => banner.init());
    } else {
      banner.init();
    }
  }

})();








