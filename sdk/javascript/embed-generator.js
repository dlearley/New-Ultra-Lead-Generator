/**
 * UltraLead Embed Code Generator
 * 
 * This utility generates embed codes for various lead capture scenarios
 */

// Example 1: Basic Tracking
function generateTrackingCode(apiKey, orgId) {
  return `
<!-- UltraLead Tracking -->
<script>
(function() {
  var script = document.createElement('script');
  script.src = 'https://cdn.ultralead.com/ultralead.min.js';
  script.async = true;
  script.onload = function() {
    UltraLead.init({
      apiKey: '${apiKey}',
      organizationId: '${orgId}',
    });
  };
  document.head.appendChild(script);
})();
</script>
`;
}

// Example 2: Form Embed
function generateFormEmbed(formId) {
  return `
<!-- UltraLead Form -->
<form data-ul-form="${formId}" data-ul-success="message">
  <input type="email" name="email" placeholder="Enter your email" required>
  <button type="submit">Subscribe</button>
</form>
`;
}

// Example 3: Popup Script
function generatePopupScript(formId, options = {}) {
  const { delay = 5, title = 'Subscribe' } = options;
  return `
<!-- UltraLead Popup -->
<script>
setTimeout(function() {
  if (typeof UltraLead !== 'undefined') {
    UltraLead.showPopup('${formId}', {
      title: '${title}',
      position: 'bottom-right',
    });
  }
}, ${delay * 1000});
</script>
`;
}

// Example 4: Exit Intent
function generateExitIntentCode(formId) {
  return `
<!-- UltraLead Exit Intent -->
<script>
(function() {
  var shown = false;
  document.addEventListener('mouseout', function(e) {
    if (e.clientY < 10 && !shown && typeof UltraLead !== 'undefined') {
      shown = true;
      UltraLead.showPopup('${formId}', {
        title: 'Wait! Before you go...',
        description: 'Subscribe for exclusive updates.',
      });
    }
  });
})();
</script>
`;
}

// Example 5: Landing Page Widget
function generateLandingPageWidget(pageId) {
  return `
<!-- UltraLead Landing Page -->
<iframe 
  src="https://api.ultralead.com/capture/public/pages/${pageId}"
  width="100%"
  height="800"
  frameborder="0"
  style="border: none;">
</iframe>
`;
}

// Module exports for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateTrackingCode,
    generateFormEmbed,
    generatePopupScript,
    generateExitIntentCode,
    generateLandingPageWidget,
  };
}
