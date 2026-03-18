/**
 * UltraLead Capture SDK - JavaScript
 * Version: 1.0.0
 * 
 * Intelligent lead capture for websites
 * - Visitor tracking
 * - Form capture
 * - Lead enrichment
 * - Real-time analytics
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' 
    ? module.exports = factory() 
    : typeof define === 'function' && define.amd 
    ? define(factory) 
    : (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.UltraLead = factory());
}(this, function () {
  'use strict';

  // ============================================================
  // CONFIGURATION & STATE
  // ============================================================
  
  const SDK_VERSION = '1.0.0';
  const DEFAULT_ENDPOINT = 'https://api.ultralead.com';
  
  let config = {
    apiKey: null,
    endpoint: DEFAULT_ENDPOINT,
    organizationId: null,
    debug: false,
    autoTrack: true,
    fingerprinting: true,
    enrichment: true,
  };
  
  let state = {
    initialized: false,
    visitorId: null,
    sessionId: null,
    fingerprint: null,
    queue: [],
    currentPage: {
      url: null,
      title: null,
      referrer: null,
      startTime: null,
    },
  };

  // ============================================================
  // UTILITIES
  // ============================================================

  const logger = {
    log: (...args) => config.debug && console.log('[UltraLead]', ...args),
    warn: (...args) => config.debug && console.warn('[UltraLead]', ...args),
    error: (...args) => config.debug && console.error('[UltraLead]', ...args),
  };

  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getCookie(name) {
    const value = '; ' + document.cookie;
    const parts = value.split('; ' + name + '=');
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function setCookie(name, value, days = 365) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/; SameSite=Lax';
  }

  function getStorage(key) {
    try {
      return localStorage.getItem('ul_' + key);
    } catch (e) {
      return getCookie('ul_' + key);
    }
  }

  function setStorage(key, value) {
    try {
      localStorage.setItem('ul_' + key, value);
    } catch (e) {
      setCookie('ul_' + key, value);
    }
  }

  // Simple fingerprinting
  function generateFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('UltraLead Fingerprint', 2, 2);
    
    const data = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.availWidth + 'x' + screen.availHeight,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
      !!window.sessionStorage,
      !!window.localStorage,
      navigator.hardwareConcurrency,
    ].join('::');
    
    // Simple hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  // ============================================================
  // API CLIENT
  // ============================================================

  async function apiClient(endpoint, options = {}) {
    const url = config.endpoint + endpoint;
    
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
      'X-Organization-ID': config.organizationId,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('API call failed:', error);
      throw error;
    }
  }

  // ============================================================
  // VISITOR TRACKING
  // ============================================================

  function initVisitor() {
    // Get or create fingerprint
    state.fingerprint = getStorage('fingerprint') || generateFingerprint();
    setStorage('fingerprint', state.fingerprint);

    // Get or create visitor ID
    state.visitorId = getStorage('visitor_id');
    
    // Get or create session ID
    state.sessionId = getStorage('session_id');
    if (!state.sessionId || isNewSession()) {
      state.sessionId = generateId();
      setStorage('session_id', state.sessionId);
      setStorage('session_start', Date.now().toString());
    }

    logger.log('Visitor initialized:', {
      fingerprint: state.fingerprint,
      visitorId: state.visitorId,
      sessionId: state.sessionId,
    });
  }

  function isNewSession() {
    const lastActivity = parseInt(getStorage('last_activity') || '0');
    const thirtyMinutes = 30 * 60 * 1000;
    return Date.now() - lastActivity > thirtyMinutes;
  }

  function updateActivity() {
    setStorage('last_activity', Date.now().toString());
  }

  // ============================================================
  // PAGE TRACKING
  // ============================================================

  function getPageData() {
    return {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    };
  }

  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get('utm_source') || undefined,
      utmMedium: params.get('utm_medium') || undefined,
      utmCampaign: params.get('utm_campaign') || undefined,
      utmContent: params.get('utm_content') || undefined,
      utmTerm: params.get('utm_term') || undefined,
    };
  }

  async function trackPageView() {
    if (!state.initialized) return;

    const pageData = getPageData();
    const utmParams = getUTMParams();
    
    state.currentPage = {
      ...pageData,
      startTime: Date.now(),
    };

    try {
      const response = await apiClient('/capture/visitors/track', {
        method: 'POST',
        body: {
          fingerprint: state.fingerprint,
          sessionId: state.sessionId,
          pageUrl: pageData.url,
          pageTitle: pageData.title,
          referrer: pageData.referrer,
          ...utmParams,
        },
      });

      // Save visitor ID if returned
      if (response.visitorId && !state.visitorId) {
        state.visitorId = response.visitorId;
        setStorage('visitor_id', response.visitorId);
      }

      logger.log('Page view tracked:', response);
    } catch (error) {
      logger.error('Failed to track page view:', error);
    }

    updateActivity();
  }

  // ============================================================
  // FORM HANDLING
  // ============================================================

  async function submitForm(formId, formData) {
    if (!state.initialized) {
      throw new Error('UltraLead not initialized. Call UltraLead.init() first.');
    }

    const pageData = getPageData();
    const utmParams = getUTMParams();

    try {
      const response = await apiClient(`/capture/public/forms/${formId}/submit`, {
        method: 'POST',
        body: {
          formId,
          data: formData,
          visitorId: state.visitorId,
          sessionId: state.sessionId,
          fingerprint: state.fingerprint,
          pageUrl: pageData.url,
          referrer: pageData.referrer,
          ...utmParams,
        },
      });

      logger.log('Form submitted:', response);
      return response;
    } catch (error) {
      logger.error('Form submission failed:', error);
      throw error;
    }
  }

  function attachFormListeners() {
    // Find all forms with data-ul-form attribute
    const forms = document.querySelectorAll('form[data-ul-form]');
    
    forms.forEach((form) => {
      const formId = form.getAttribute('data-ul-form');
      if (!formId) return;

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Collect form data
        const formData = {};
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach((input) => {
          const name = input.getAttribute('name');
          if (name) {
            formData[name] = input.value;
          }
        });

        try {
          const response = await submitForm(formId, formData);
          
          // Handle success
          const successHandler = form.getAttribute('data-ul-success');
          if (successHandler === 'redirect') {
            const redirectUrl = form.getAttribute('data-ul-redirect');
            if (redirectUrl) window.location.href = redirectUrl;
          } else if (successHandler === 'message') {
            const message = form.getAttribute('data-ul-message') || 'Thank you!';
            alert(message);
          }
          
          // Reset form
          form.reset();
        } catch (error) {
          // Handle error
          const errorMessage = form.getAttribute('data-ul-error') || 'Submission failed. Please try again.';
          alert(errorMessage);
        }
      });
    });

    logger.log('Attached to', forms.length, 'forms');
  }

  // ============================================================
  // POPUP FORMS
  // ============================================================

  let activePopup = null;

  function createPopup(formId, options = {}) {
    const defaults = {
      title: 'Subscribe',
      description: 'Stay updated with our latest news.',
      position: 'bottom-right',
      delay: 0,
      fields: [
        { name: 'email', type: 'email', placeholder: 'Enter your email', required: true },
      ],
      submitText: 'Subscribe',
      thankYouMessage: 'Thank you for subscribing!',
    };

    const config = { ...defaults, ...options };

    // Create popup element
    const popup = document.createElement('div');
    popup.className = `ul-popup ul-popup-${config.position}`;
    popup.style.cssText = `
      position: fixed;
      ${config.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
      ${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      width: 400px;
      max-width: calc(100% - 40px);
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      padding: 24px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: none;
    `;

    // Build form HTML
    let fieldsHtml = '';
    config.fields.forEach((field) => {
      fieldsHtml += `
        <input
          type="${field.type}"
          name="${field.name}"
          placeholder="${field.placeholder || ''}"
          ${field.required ? 'required' : ''}
          style="
            width: 100%;
            padding: 12px;
            margin-bottom: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            box-sizing: border-box;
          "
        >
      `;
    });

    popup.innerHTML = `
      <button class="ul-popup-close" style="
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #9ca3af;
      ">×</button>
      <h3 style="margin: 0 0 8px 0; font-size: 20px; color: #111827;">${config.title}</h3>
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">${config.description}</p>
      <form data-ul-popup-form>
        ${fieldsHtml}
        <button type="submit" style="
          width: 100%;
          padding: 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        ">${config.submitText}</button>
      </form>
    `;

    // Add to DOM
    document.body.appendChild(popup);

    // Close button
    popup.querySelector('.ul-popup-close').addEventListener('click', () => {
      hidePopup(popup);
    });

    // Form submission
    const form = popup.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {};
      const inputs = form.querySelectorAll('input');
      inputs.forEach((input) => {
        formData[input.name] = input.value;
      });

      try {
        await submitForm(formId, formData);
        popup.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">✓</div>
            <h3 style="margin: 0 0 8px 0; color: #111827;">${config.thankYouMessage}</h3>
          </div>
        `;
        
        setTimeout(() => hidePopup(popup), 3000);
      } catch (error) {
        alert('Submission failed. Please try again.');
      }
    });

    return popup;
  }

  function showPopup(popup) {
    if (activePopup) {
      hidePopup(activePopup);
    }
    activePopup = popup;
    popup.style.display = 'block';
    
    // Animate in
    popup.style.opacity = '0';
    popup.style.transform = 'translateY(20px)';
    setTimeout(() => {
      popup.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      popup.style.opacity = '1';
      popup.style.transform = 'translateY(0)';
    }, 10);
  }

  function hidePopup(popup) {
    popup.style.opacity = '0';
    popup.style.transform = 'translateY(20px)';
    setTimeout(() => {
      popup.style.display = 'none';
      if (activePopup === popup) {
        activePopup = null;
      }
    }, 300);
  }

  // ============================================================
  // MAIN SDK OBJECT
  // ============================================================

  const UltraLead = {
    version: SDK_VERSION,

    /**
     * Initialize the SDK
     * @param {Object} options - Configuration options
     * @param {string} options.apiKey - Your API key
     * @param {string} options.organizationId - Your organization ID
     * @param {string} options.endpoint - API endpoint (optional)
     * @param {boolean} options.debug - Enable debug logging
     * @param {boolean} options.autoTrack - Auto-track page views
     */
    init: function(options) {
      if (state.initialized) {
        logger.warn('Already initialized');
        return this;
      }

      if (!options.apiKey) {
        throw new Error('API key is required');
      }

      if (!options.organizationId) {
        throw new Error('Organization ID is required');
      }

      config = { ...config, ...options };
      
      initVisitor();
      
      if (config.autoTrack) {
        trackPageView();
        
        // Track on route changes (SPA support)
        window.addEventListener('popstate', trackPageView);
        
        // Intercept history.pushState
        const originalPushState = history.pushState;
        history.pushState = function() {
          originalPushState.apply(this, arguments);
          setTimeout(trackPageView, 0);
        };
      }

      // Attach to forms
      attachFormListeners();

      state.initialized = true;
      logger.log('UltraLead SDK initialized', { version: SDK_VERSION });

      return this;
    },

    /**
     * Track a page view manually
     */
    trackPageView: trackPageView,

    /**
     * Identify a visitor
     * @param {string} email - Visitor email
     * @param {Object} traits - Additional traits
     */
    identify: async function(email, traits = {}) {
      if (!state.initialized) {
        throw new Error('UltraLead not initialized');
      }

      try {
        const response = await apiClient('/capture/visitors/identify', {
          method: 'POST',
          body: {
            visitorId: state.visitorId,
            email,
            ...traits,
          },
        });

        logger.log('Visitor identified:', response);
        return response;
      } catch (error) {
        logger.error('Identification failed:', error);
        throw error;
      }
    },

    /**
     * Submit a form
     * @param {string} formId - Form ID
     * @param {Object} data - Form data
     */
    submitForm: submitForm,

    /**
     * Show a popup form
     * @param {string} formId - Form ID
     * @param {Object} options - Popup options
     */
    showPopup: function(formId, options = {}) {
      if (!state.initialized) {
        throw new Error('UltraLead not initialized');
      }

      const popup = createPopup(formId, options);
      
      if (options.delay > 0) {
        setTimeout(() => showPopup(popup), options.delay * 1000);
      } else {
        showPopup(popup);
      }

      return {
        close: () => hidePopup(popup),
      };
    },

    /**
     * Get current visitor info
     */
    getVisitorInfo: function() {
      return {
        visitorId: state.visitorId,
        sessionId: state.sessionId,
        fingerprint: state.fingerprint,
      };
    },

    /**
     * Enable debug mode
     */
    debug: function(enable = true) {
      config.debug = enable;
      return this;
    },
  };

  return UltraLead;
}));
