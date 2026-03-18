# UltraLead JavaScript SDK

The official JavaScript SDK for UltraLead - intelligent lead capture for websites.

## Installation

### Option 1: Script Tag (Recommended)
```html
<script src="https://cdn.ultralead.com/ultralead.min.js"></script>
```

### Option 2: NPM
```bash
npm install @ultralead/sdk
```

```javascript
import UltraLead from '@ultralead/sdk';
```

## Quick Start

```html
<script src="https://cdn.ultralead.com/ultralead.min.js"></script>
<script>
  UltraLead.init({
    apiKey: 'YOUR_API_KEY',
    organizationId: 'YOUR_ORG_ID',
  });
</script>
```

## Configuration

```javascript
UltraLead.init({
  apiKey: 'YOUR_API_KEY',           // Required
  organizationId: 'YOUR_ORG_ID',    // Required
  endpoint: 'https://api.your-domain.com', // Optional, defaults to UltraLead cloud
  debug: false,                     // Enable debug logging
  autoTrack: true,                  // Auto-track page views
});
```

## Features

### 1. Automatic Visitor Tracking

The SDK automatically tracks:
- Page views
- Session duration
- Referrer information
- UTM parameters
- Device information

```javascript
// Initialize with auto-tracking (default)
UltraLead.init({
  apiKey: 'YOUR_API_KEY',
  organizationId: 'YOUR_ORG_ID',
  autoTrack: true, // Default
});
```

### 2. Form Capture

#### Automatic Form Capture

Add `data-ul-form` attribute to any form:

```html
<form data-ul-form="FORM_ID">
  <input type="email" name="email" placeholder="Email" required>
  <input type="text" name="name" placeholder="Name">
  <button type="submit">Subscribe</button>
</form>
```

The SDK automatically:
- Captures form submissions
- Creates contacts in your CRM
- Tracks conversion attribution
- Shows thank you message

#### Manual Form Submission

```javascript
UltraLead.submitForm('FORM_ID', {
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  company: 'Acme Inc',
});
```

### 3. Popup Forms

Show a popup form programmatically:

```javascript
UltraLead.showPopup('FORM_ID', {
  title: 'Get Our Free Ebook',
  description: 'Subscribe to receive our comprehensive guide.',
  position: 'bottom-right', // or 'bottom-left', 'center'
  delay: 5, // Show after 5 seconds
  fields: [
    { name: 'email', type: 'email', placeholder: 'Enter your email', required: true },
    { name: 'name', type: 'text', placeholder: 'Your name' },
  ],
  submitText: 'Download Now',
  thankYouMessage: 'Check your email for the download link!',
});
```

#### Trigger Popups on Events

```javascript
// Exit intent
let exitIntentShown = false;
document.addEventListener('mouseout', (e) => {
  if (e.clientY < 10 && !exitIntentShown) {
    exitIntentShown = true;
    UltraLead.showPopup('EXIT_POPUP_ID', {
      title: 'Wait! Before you go...',
      description: 'Get 10% off your first purchase.',
    });
  }
});

// Scroll percentage
window.addEventListener('scroll', () => {
  const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  if (scrollPercent > 50) {
    UltraLead.showPopup('SCROLL_POPUP_ID', {
      title: 'Enjoying the content?',
    });
  }
});

// Time on page
setTimeout(() => {
  UltraLead.showPopup('TIME_POPUP_ID', {
    title: 'Still browsing?',
    description: 'Sign up for exclusive updates.',
  });
}, 30000); // After 30 seconds
```

### 4. Visitor Identification

Identify visitors when they provide their email:

```javascript
// After a user logs in or provides email
UltraLead.identify('john@example.com', {
  firstName: 'John',
  lastName: 'Doe',
  company: 'Acme Inc',
  title: 'CEO',
});
```

### 5. Progressive Profiling

Capture additional data over time:

```javascript
// First interaction - just email
UltraLead.submitForm('QUICK_FORM_ID', {
  email: 'john@example.com',
});

// Later - capture more details
UltraLead.submitForm('DETAILED_FORM_ID', {
  email: 'john@example.com',
  company: 'Acme Inc',
  industry: 'Technology',
  companySize: '50-200',
});
```

## Advanced Usage

### Custom Page Tracking

```javascript
// Disable auto-track
UltraLead.init({
  apiKey: 'YOUR_API_KEY',
  organizationId: 'YOUR_ORG_ID',
  autoTrack: false,
});

// Track manually
UltraLead.trackPageView();
```

### Multi-Page Application

The SDK automatically handles page navigation via:
- `popstate` events (back/forward buttons)
- `history.pushState` overrides

For custom routing:

```javascript
// Your router
router.on('routeChange', () => {
  UltraLead.trackPageView();
});
```

### Debug Mode

```javascript
// Enable debug logging
UltraLead.init({
  apiKey: 'YOUR_API_KEY',
  organizationId: 'YOUR_ORG_ID',
  debug: true,
});

// Or enable later
UltraLead.debug(true);
```

### Get Visitor Info

```javascript
const visitor = UltraLead.getVisitorInfo();
console.log(visitor.visitorId);
console.log(visitor.sessionId);
console.log(visitor.fingerprint);
```

## Form Attributes

### Form Behavior

```html
<form 
  data-ul-form="FORM_ID"
  data-ul-success="redirect"
  data-ul-redirect="/thank-you">
  ...
</form>
```

### Available Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| `data-ul-form` | Form ID (required) | `"FORM_ID"` |
| `data-ul-success` | Success behavior | `"redirect"`, `"message"` |
| `data-ul-redirect` | Redirect URL | `"/thank-you"` |
| `data-ul-message` | Success message | `"Thanks for subscribing!"` |
| `data-ul-error` | Error message | `"Please try again."` |

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- Internet Explorer 11 (with polyfills)

## Privacy & GDPR

The SDK:
- Respects Do Not Track headers
- Anonymizes IP addresses
- Stores data locally only
- Supports cookie consent

```javascript
// Check if tracking is allowed
if (userConsentedToTracking()) {
  UltraLead.init({
    apiKey: 'YOUR_API_KEY',
    organizationId: 'YOUR_ORG_ID',
  });
}
```

## API Reference

### `UltraLead.init(options)`
Initialize the SDK.

### `UltraLead.trackPageView()`
Manually track a page view.

### `UltraLead.identify(email, traits)`
Identify the current visitor.

### `UltraLead.submitForm(formId, data)`
Submit form data programmatically.

### `UltraLead.showPopup(formId, options)`
Display a popup form.

Returns: `{ close: () => void }`

### `UltraLead.getVisitorInfo()`
Get current visitor information.

### `UltraLead.debug(enable)`
Enable or disable debug logging.

## Examples

### Newsletter Signup

```html
<form data-ul-form="NEWSLETTER_FORM" data-ul-success="message">
  <input type="email" name="email" placeholder="Your email" required>
  <button>Subscribe</button>
</form>
```

### Exit Intent Popup

```javascript
UltraLead.init({
  apiKey: 'YOUR_API_KEY',
  organizationId: 'YOUR_ORG_ID',
});

// Show exit intent after 5 seconds on page
document.addEventListener('mouseout', (e) => {
  if (e.clientY < 5 && Date.now() - pageLoadTime > 5000) {
    UltraLead.showPopup('EXIT_FORM', {
      title: 'Wait! Get 10% off',
      delay: 0,
    });
  }
});
```

### Lead Magnet Download

```html
<button onclick="showEbookPopup()">Download Free Ebook</button>

<script>
function showEbookPopup() {
  UltraLead.showPopup('EBOOK_FORM', {
    title: 'Download Our Ebook',
    description: 'Get the complete guide to lead generation.',
    submitText: 'Send Me The Ebook',
    thankYouMessage: 'Check your email!',
  });
}
</script>
```

## Support

For support, contact support@ultralead.com or visit our documentation at https://docs.ultralead.com

## License

MIT License - UltraLead Inc.
