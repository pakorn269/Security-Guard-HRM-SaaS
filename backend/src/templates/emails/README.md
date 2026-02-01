# Email Templates Documentation

## Overview

This directory contains Handlebars (`.hbs`) templates for all email notifications in the Security Guard HRM system.

## Available Templates

### 1. leave-request-submitted.hbs
**Purpose:** Notify managers when an employee submits a new leave request

**Triggered by:** New leave request creation (status: pending)

**Recipients:** Managers and Company Admins

**Preference Key:** `email_notifications.request`

**Data Required:**
```typescript
{
  employeeName: string;      // "John Doe"
  leaveType: string;         // "วันลาพักร้อน" or "Annual Leave"
  startDate: string;         // "2024-02-01"
  endDate: string;           // "2024-02-03"
  totalDays: number;         // 2.5
  reason: string;            // Employee's reason
  dashboardUrl: string;      // Base URL for links
  companyName: string;       // Company branding
}
```

**Key Elements:**
- Blue color scheme (#3b82f6)
- Bell icon (🔔)
- Leave details card
- Reason display (if provided)
- "View Leave Request" button
- Reminder for quick review

---

### 2. leave-request-approved.hbs
**Purpose:** Notify employee when their leave request is approved

**Triggered by:** Leave request approval

**Recipients:** Requesting employee

**Preference Key:** `email_notifications.approval`

**Data Required:**
```typescript
{
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  approverName?: string;     // Who approved it
  dashboardUrl: string;
  companyName: string;
}
```

**Key Elements:**
- Green color scheme (#10b981)
- Checkmark icon (✅)
- Success message
- Approver name (if available)
- Preparation checklist
- "View My Requests" button

---

### 3. leave-request-rejected.hbs
**Purpose:** Notify employee when their leave request is rejected

**Triggered by:** Leave request rejection

**Recipients:** Requesting employee

**Preference Key:** `email_notifications.approval`

**Data Required:**
```typescript
{
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  approverName?: string;     // Who rejected it
  rejectionReason?: string;  // Why it was rejected
  dashboardUrl: string;
  companyName: string;
}
```

**Key Elements:**
- Red color scheme (#ef4444)
- Cross icon (❌)
- Rejection reason (highlighted)
- Reviewer name (if available)
- Next steps guidance
- "View My Requests" button

---

### 4. leave-request-cancelled.hbs
**Purpose:** Notify managers when an employee cancels their leave request

**Triggered by:** Leave request cancellation by employee

**Recipients:** Managers and Company Admins

**Preference Key:** `email_notifications.request`

**Data Required:**
```typescript
{
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  dashboardUrl: string;
  companyName: string;
}
```

**Key Elements:**
- Orange color scheme (#f59e0b)
- Prohibition icon (🚫)
- Cancellation notice
- "No action needed" message
- "View All Requests" button

---

### 5. leave-reminder.hbs
**Purpose:** Remind employee about upcoming leave starting tomorrow

**Triggered by:** Scheduled job (daily at 08:00 AM)

**Recipients:** Employee with approved leave starting tomorrow

**Preference Key:** `email_notifications.reminder`

**Data Required:**
```typescript
{
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  dashboardUrl: string;
  companyName: string;
}
```

**Key Elements:**
- Purple color scheme (#8b5cf6)
- Bell icon (🔔)
- Reminder message
- Preparation checklist (handover tasks, auto-reply, etc.)
- "View Details" button
- Friendly sign-off

---

## Template Structure

All templates follow this consistent structure:

```html
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Title</title>
</head>
<body>
  <table>
    <!-- Header: Company logo/name with colored background -->
    <tr><td>Header</td></tr>

    <!-- Body: Icon, title, details card, CTA button -->
    <tr><td>Body Content</td></tr>

    <!-- Footer: Copyright, legal notice -->
    <tr><td>Footer</td></tr>
  </table>
</body>
</html>
```

## Handlebars Helpers

### formatDate
Formats ISO date strings to Thai locale

**Usage:**
```handlebars
{{formatDate startDate}}
```

**Output:**
```
1 กุมภาพันธ์ 2024
```

### eq
Equality comparison helper

**Usage:**
```handlebars
{{#if (eq status "approved")}}
  Approved!
{{/if}}
```

## Template Variables

All templates receive these base variables automatically:

- `baseUrl` - Frontend application URL
- `logoUrl` - Company logo URL (optional)
- `primaryColor` - Brand color for buttons/accents
- `companyName` - Company name for branding
- `currentYear` - Current year for copyright

## Color Schemes

| Template | Color | Usage |
|----------|-------|-------|
| Submitted | Blue (#3b82f6) | New requests |
| Approved | Green (#10b981) | Success states |
| Rejected | Red (#ef4444) | Rejections/errors |
| Cancelled | Orange (#f59e0b) | Warnings |
| Reminder | Purple (#8b5cf6) | Informational |

## Customization

### Change Colors
Edit `backend/src/config/email.config.ts`:
```typescript
branding: {
  primaryColor: '#your-color',
}
```

### Add Logo
1. Host logo image (PNG/SVG, max 150px width)
2. Set environment variable:
   ```env
   EMAIL_LOGO_URL=https://cdn.example.com/logo.png
   ```

### Modify Templates
1. Edit `.hbs` files in this directory
2. Use Handlebars syntax for dynamic content
3. Test with different data scenarios
4. Ensure mobile responsiveness

## Testing Templates

### Manual Testing
```typescript
import { emailService } from './services/email.service';

await emailService.send({
  to: 'test@example.com',
  subject: 'Test Email',
  templateName: 'leave-request-approved',
  templateData: {
    employeeName: 'Test User',
    leaveType: 'Annual Leave',
    startDate: '2024-02-01',
    endDate: '2024-02-03',
    totalDays: 2,
    dashboardUrl: 'http://localhost:5173',
    companyName: 'Test Company',
  },
});
```

### Preview in Browser
1. Compile template with sample data
2. Save output as `.html` file
3. Open in browser
4. Test responsive breakpoints

## Email Client Compatibility

Templates are tested and compatible with:
- ✅ Gmail (Web, iOS, Android)
- ✅ Outlook (Web, Desktop)
- ✅ Apple Mail (iOS, macOS)
- ✅ Yahoo Mail
- ✅ ProtonMail
- ✅ Thunderbird

## Best Practices

1. **Keep It Simple**
   - Avoid complex CSS
   - Use tables for layout
   - Inline styles preferred

2. **Mobile First**
   - Max width: 600px
   - Touch-friendly buttons (min 44px)
   - Readable font sizes (14px+)

3. **Accessibility**
   - Alt text for images
   - Sufficient color contrast
   - Semantic HTML

4. **Performance**
   - Optimize images
   - Minimize template size
   - Cache compiled templates

5. **Testing**
   - Test with real data
   - Check all conditional branches
   - Verify links work
   - Test on multiple clients

## Troubleshooting

### Template Not Found
- Check filename matches exactly (case-sensitive)
- Verify file is in `backend/src/templates/emails/`
- Ensure `.hbs` extension

### Variables Not Rendering
- Check data object has all required fields
- Verify Handlebars syntax (`{{variable}}`)
- Review template data interface

### Styling Issues
- Use inline styles (most compatible)
- Avoid flexbox/grid (poor support)
- Test in target email clients
- Use table-based layouts

### Email Not Sending
- Check Resend API key
- Verify email address format
- Review logs for errors
- Check rate limits

## Support

For issues or questions:
1. Check error logs
2. Review template syntax
3. Test with minimal data
4. Check email service configuration
5. Consult Resend documentation
