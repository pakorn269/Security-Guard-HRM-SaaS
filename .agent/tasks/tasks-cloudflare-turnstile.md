# Cloudflare Turnstile Implementation - Security Enhancement

## Overview

**Feature:** Cloudflare Turnstile integration for LIFF account linking  
**Purpose:** Prevent brute force attacks on employee code + phone verification  
**Why Turnstile:** Privacy-focused, no CAPTCHA puzzles, better UX than reCAPTCHA

---

## Pre-Implementation Checklist

```
Before starting:
- [ ] Create Cloudflare account (if not exists)
- [ ] Review existing frontend form components
- [ ] Review existing backend validation middleware patterns
- [ ] Review existing environment variables setup
- [ ] Decide on Turnstile widget mode (managed, non-interactive, invisible)
```

---

## Phase 1: Cloudflare Dashboard Setup

### 1.1 Create Turnstile Widget
```
Tasks:
- [ ] Log in to Cloudflare Dashboard
- [ ] Navigate to Turnstile section
- [ ] Click "Add Widget"
- [ ] Configure widget:
      • Widget name: "HRM LIFF Account Linking" (or appropriate name)
      • Domains: Add your domains (localhost for dev, production domain)
      • Widget Mode: Choose one:
        - Managed (recommended): Cloudflare decides when to show challenge
        - Non-interactive: Always invisible, may fail silently
        - Invisible: Similar to managed but never shows widget
      
- [ ] Copy Site Key (public, used in frontend)
- [ ] Copy Secret Key (private, used in backend)
```

### 1.2 Environment Variables
```
Tasks:
- [ ] Add to backend .env:
      TURNSTILE_SECRET_KEY=0x4AAAAAAA...

- [ ] Add to frontend .env:
      VITE_TURNSTILE_SITE_KEY=0x4AAAAAAA...
      (or appropriate prefix based on your build tool)

- [ ] Add to production environment variables
- [ ] Add placeholder values to .env.example files
```

---

## Phase 2: Backend - Turnstile Verification

### 2.1 Analyze Existing Patterns
```
Before implementation:
- [ ] Review existing validation/middleware structure
- [ ] Review existing HTTP client setup (axios, fetch, etc.)
- [ ] Review existing error response format
- [ ] Review how other external API calls are handled
```

### 2.2 Create Turnstile Verification Service
```
Purpose: Verify Turnstile token with Cloudflare API

Cloudflare Verification Endpoint:
POST https://challenges.cloudflare.com/turnstile/v0/siteverify

Request Body:
{
  "secret": "your-secret-key",
  "response": "token-from-frontend",
  "remoteip": "user-ip-address" // optional but recommended
}

Response (success):
{
  "success": true,
  "challenge_ts": "2025-01-20T10:00:00.000Z",
  "hostname": "your-domain.com",
  "error-codes": [],
  "action": "",
  "cdata": ""
}

Response (failure):
{
  "success": false,
  "error-codes": ["invalid-input-response"]
}

Tasks:
- [ ] Create Turnstile service/utility file
- [ ] Implement verification function:
      • Accept token and optional IP address
      • Call Cloudflare siteverify endpoint
      • Return success/failure with error details
      
- [ ] Handle network errors gracefully
- [ ] Add logging for failed verifications (for monitoring)
- [ ] Consider caching/rate limiting API calls
```

### 2.3 Create Turnstile Middleware (Optional Approach)
```
Purpose: Reusable middleware for protected endpoints

Tasks:
- [ ] Create middleware that:
      • Extracts Turnstile token from request body or header
      • Calls verification service
      • Returns 400 error if verification fails
      • Calls next() if verification succeeds
      
- [ ] Support skipping in development (optional, via env flag)
- [ ] Add appropriate error messages with Thai translations
```

### 2.4 Integrate with Linking Endpoints
```
Tasks:
- [ ] Update POST /api/v1/auth/line/link-employee
      • Add 'turnstileToken' to request validation
      • Verify Turnstile before processing
      • Return specific error if Turnstile fails
      
- [ ] Update POST /api/v1/auth/line/link-credentials (if needed)
      • Same as above
      
- [ ] Consider adding to other sensitive endpoints:
      • Login endpoint
      • Password reset endpoint
      • Registration endpoint
```

### 2.5 Error Handling
```
Turnstile Error Codes (from Cloudflare):
- missing-input-secret: Secret key not provided
- invalid-input-secret: Secret key invalid
- missing-input-response: Token not provided
- invalid-input-response: Token invalid or expired
- invalid-widget-id: Widget ID mismatch
- invalid-parsed-secret: Secret key malformed
- bad-request: Request malformed
- timeout-or-duplicate: Token already used or expired
- internal-error: Cloudflare internal error

Tasks:
- [ ] Map Cloudflare errors to user-friendly messages
- [ ] Add Thai translations for errors
- [ ] Log detailed errors server-side
- [ ] Return generic message to client (security best practice)
```

---

## Phase 3: Frontend - Turnstile Widget

### 3.1 Analyze Existing Patterns
```
Before implementation:
- [ ] Review existing form component structure
- [ ] Review how external scripts are loaded (if any)
- [ ] Review existing form validation patterns
- [ ] Check if React hook patterns are used
```

### 3.2 Install/Setup Turnstile
```
Option A: Official React Package
npm install @marsidev/react-turnstile
(or similar community package)

Option B: Manual Script Loading
Load Turnstile script and use vanilla JS

Tasks:
- [ ] Choose installation method based on project patterns
- [ ] If using package, install it
- [ ] If manual, plan script loading strategy
```

### 3.3 Create Turnstile Component/Hook
```
Purpose: Reusable Turnstile integration

Using @marsidev/react-turnstile:

Tasks:
- [ ] Create wrapper component or hook
- [ ] Handle widget states:
      • Loading
      • Ready
      • Success (token received)
      • Error
      • Expired
      
- [ ] Expose:
      • token value
      • isVerified status
      • reset function
      • error state
      
- [ ] Style widget container to match app design
```

### 3.4 Create Custom Hook (Recommended Approach)
```
Purpose: Easy integration with any form

Hook Interface:
const { 
  token,           // Current Turnstile token
  isReady,         // Widget loaded and ready
  isVerified,      // User passed verification
  error,           // Any error message
  reset,           // Function to reset widget
  TurnstileWidget  // Component to render
} = useTurnstile(options)

Tasks:
- [ ] Create hook file
- [ ] Implement state management
- [ ] Handle token expiration (tokens expire after 300 seconds)
- [ ] Implement auto-reset on expiration
- [ ] Return component and state
```

### 3.5 Integrate with Employee Linking Form
```
Location: Employee code + phone linking page

Tasks:
- [ ] Import Turnstile hook/component
- [ ] Add Turnstile widget to form (above or below submit button)
- [ ] Disable submit button until Turnstile verified
- [ ] Include token in form submission
- [ ] Handle Turnstile errors in UI
- [ ] Reset Turnstile on form submission failure
- [ ] Add loading state while Turnstile initializes

UI Placement:
┌─────────────────────────────────────┐
│  รหัสพนักงาน / Employee Code        │
│  ┌─────────────────────────────┐   │
│  │ EMP001                      │   │
│  └─────────────────────────────┘   │
│                                     │
│  เบอร์โทรศัพท์ / Phone Number       │
│  ┌─────────────────────────────┐   │
│  │ 0891234567                  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │    [Turnstile Widget]       │   │  ← Widget here
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      ยืนยัน / Verify        │   │  ← Disabled until verified
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### 3.6 Integrate with Credentials Linking Form (Optional)
```
Tasks:
- [ ] Same integration as employee linking form
- [ ] Consider if Turnstile is needed here 
      (password already provides some protection)
```

### 3.7 Handle Edge Cases
```
Tasks:
- [ ] Handle Turnstile script load failure
      • Show retry button
      • Allow form submission without Turnstile? (decision needed)
      
- [ ] Handle Turnstile in LIFF environment
      • Test that Turnstile works inside LINE app WebView
      • May need to allowlist LINE user-agents
      
- [ ] Handle token expiration during form fill
      • Auto-refresh or prompt user
      
- [ ] Handle users with JavaScript disabled
      • Show appropriate message
```

---

## Phase 4: Styling & UX

### 4.1 Turnstile Widget Appearance
```
Turnstile supports themes:
- light (default)
- dark
- auto (follows system preference)

Tasks:
- [ ] Choose theme based on app design
- [ ] Pass theme option to widget
- [ ] Ensure widget fits mobile layout
- [ ] Test in both Thai and English contexts
```

### 4.2 Loading States
```
Tasks:
- [ ] Show skeleton/placeholder while Turnstile loads
- [ ] Disable submit button with clear indication
- [ ] Add helper text: "กรุณารอสักครู่..." / "Please wait..."
```

### 4.3 Error States
```
Tasks:
- [ ] Style Turnstile error messages
- [ ] Provide retry option on failure
- [ ] Clear error on successful retry
```

---

## Phase 5: Testing

### 5.1 Cloudflare Test Keys
```
Cloudflare provides test keys for development:

Always Pass:
- Site Key: 1x00000000000000000000AA
- Secret Key: 1x0000000000000000000000000000000AA

Always Fail:
- Site Key: 2x00000000000000000000AB
- Secret Key: 2x0000000000000000000000000000000AB

Forced Interactive:
- Site Key: 3x00000000000000000000FF
- Secret Key: 3x0000000000000000000000000000000FF

Tasks:
- [ ] Use test keys during development
- [ ] Set up different keys for dev/staging/production
- [ ] Test with "always fail" key to verify error handling
```

### 5.2 Backend Tests
```
Tasks:
- [ ] Unit test Turnstile verification service
      • Mock Cloudflare API responses
      • Test success case
      • Test failure cases (invalid token, expired, etc.)
      • Test network error handling
      
- [ ] Integration test with linking endpoints
      • Test missing Turnstile token
      • Test invalid Turnstile token
      • Test valid flow end-to-end
```

### 5.3 Frontend Tests
```
Tasks:
- [ ] Test Turnstile hook/component
      • Test loading state
      • Test success callback
      • Test error handling
      • Test reset functionality
      
- [ ] Test form integration
      • Test submit button disabled until verified
      • Test token included in submission
      • Test reset on form error
```

### 5.4 Manual Testing Checklist
```
- [ ] Test in Chrome desktop
- [ ] Test in Safari desktop
- [ ] Test in LINE app (iOS)
- [ ] Test in LINE app (Android)
- [ ] Test with slow network
- [ ] Test with Turnstile blocked (ad blocker)
- [ ] Test token expiration scenario
- [ ] Test form resubmission after failure
```

---

## Phase 6: Monitoring & Analytics

### 6.1 Cloudflare Dashboard
```
Tasks:
- [ ] Review Turnstile analytics in Cloudflare dashboard
      • Solve rate
      • Challenge rate
      • Error rate
      
- [ ] Set up alerts for unusual patterns
```

### 6.2 Application Logging
```
Tasks:
- [ ] Log Turnstile verification attempts (success/failure)
- [ ] Track verification time (for performance monitoring)
- [ ] Alert on high failure rates
- [ ] Do NOT log tokens (security)
```

---

## Phase 7: Translations

### 7.1 Add Translation Keys
```
Tasks:
- [ ] Add to translation files:

turnstile:
  loading: "กำลังโหลดการยืนยัน..." / "Loading verification..."
  verifying: "กำลังยืนยัน..." / "Verifying..."
  verified: "ยืนยันแล้ว" / "Verified"
  expired: "หมดเวลา กรุณาลองใหม่" / "Expired, please try again"
  error: "การยืนยันล้มเหลว" / "Verification failed"
  retry: "ลองใหม่" / "Try again"
  required: "กรุณายืนยันว่าคุณไม่ใช่บอท" / "Please verify you are not a bot"
  networkError: "ไม่สามารถโหลดการยืนยันได้" / "Could not load verification"
```

---

## Implementation Order

```
Day 1:
├── Phase 1: Cloudflare setup, get keys
└── Phase 2.1-2.2: Analyze backend, create verification service

Day 2:
├── Phase 2.3-2.4: Create middleware, integrate with endpoints
└── Phase 2.5: Error handling

Day 3:
├── Phase 3.1-3.4: Frontend setup, create hook
└── Phase 3.5: Integrate with employee linking form

Day 4:
├── Phase 4: Styling
├── Phase 5: Testing
└── Phase 7: Translations

Day 5:
├── Phase 5.4: Manual testing
├── Phase 6: Monitoring setup
└── Bug fixes
```

---

## Code Examples (Reference Only)

These are reference patterns. Adapt to match your existing codebase.

### Backend Verification (Pattern)
```typescript
// Pattern only - adapt to your structure
async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip,
      }),
    }
  );
  
  const data = await response.json();
  return data.success === true;
}
```

### Frontend Hook (Pattern)
```typescript
// Pattern only - adapt to your structure
function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'verified' | 'error'>('loading');
  
  const handleSuccess = (token: string) => {
    setToken(token);
    setStatus('verified');
  };
  
  const handleError = () => {
    setToken(null);
    setStatus('error');
  };
  
  const reset = () => {
    setToken(null);
    setStatus('ready');
    // Trigger widget reset
  };
  
  return { token, status, reset, handleSuccess, handleError };
}
```

---

## Security Notes

- [ ] Never expose TURNSTILE_SECRET_KEY to frontend
- [ ] Always verify tokens server-side (never trust frontend alone)
- [ ] Tokens are single-use; don't cache or reuse
- [ ] Tokens expire after 300 seconds
- [ ] Consider rate limiting even with Turnstile (defense in depth)
- [ ] Log verification failures for security monitoring
- [ ] Don't reveal whether employee code exists vs Turnstile failed (timing attacks)

---

## Fallback Strategy

If Turnstile is unavailable (Cloudflare outage):

```
Options:
1. Fail closed: Block form submission (more secure)
2. Fail open: Allow submission without Turnstile (better UX)
3. Fallback: Use alternative (rate limiting only)

Recommendation: Fail closed with clear message and retry option

Tasks:
- [ ] Decide on fallback strategy
- [ ] Implement chosen fallback
- [ ] Add monitoring for Turnstile availability
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2025-01-20 | Claude | Initial draft |
