# LIFF Environment Setup Guide

This document explains how to set up separate development and production environments for LINE LIFF apps.

## Overview

| Environment | Branch | URL | LIFF Channel |
|-------------|--------|-----|--------------|
| **Production** | `main` | `security-guard-hrm-saa-s-frontend.vercel.app` | Security Guard HRM |
| **Development** | `develop` | `security-guard-hrm-dev.vercel.app` ✅ | Security Guard HRM (Dev) |

---

## Production LIFF Apps

Channel: **Security Guard HRM** (Channel ID: `2008914377`)

| LIFF App | LIFF ID | Endpoint URL | Size |
|----------|---------|--------------|------|
| HRM Profile | `2008914377-cfLUyP31` | `https://security-guard-hrm-saa-s-frontend.vercel.app/liff/profile` | Tall |
| HRM Leave | `2008914377-ecuSztvj` | `https://security-guard-hrm-saa-s-frontend.vercel.app/liff/leave` | Tall |
| HRM Schedule | `2008914377-86hStTZc` | `https://security-guard-hrm-saa-s-frontend.vercel.app/liff/schedule` | Tall |
| HRM Clock In | `2008914377-NDoaNvUa` | `https://security-guard-hrm-saa-s-frontend.vercel.app/liff/clock` | Full |
| HRM Link | `2008914377-LnTodHai` | `https://security-guard-hrm-saa-s-frontend.vercel.app/liff/link` | Full |

---
## Development LIFF Apps ✅ CREATED

Channel: **Security Guard HRM (Dev)** (Channel ID: `2008935318`)

| LIFF App | LIFF ID | Endpoint URL | Size |
|----------|---------|--------------|------|
| HRM Profile (Dev) | `2008935318-Cq576ySz` | `https://security-guard-hrm-dev.vercel.app/liff/profile` | Tall |
| HRM Leave (Dev) | `2008935318-VxXFjA5g` | `https://security-guard-hrm-dev.vercel.app/liff/leave` | Tall |
| HRM Schedule (Dev) | `2008935318-50xDJLPB` | `https://security-guard-hrm-dev.vercel.app/liff/schedule` | Tall |
| HRM Clock In (Dev) | `2008935318-2hSCjYJb` | `https://security-guard-hrm-dev.vercel.app/liff/clock` | Full |
| **HRM Link (Dev)** | `2008935318-5va76yB9` | `https://security-guard-hrm-dev.vercel.app/liff/link` | Full |

### Test URLs (Open in LINE app)
- Clock: `https://liff.line.me/2008935318-2hSCjYJb`
- Link: `https://liff.line.me/2008935318-5va76yB9`

---

## Vercel Configuration

### Environment Variables

Configure in Vercel Dashboard → Settings → Environment Variables:

#### For Production (main branch)

| Variable | Value | Scope |
|----------|-------|-------|
| `VITE_LIFF_ID` | `2008914377-NDoaNvUa` | Production |
| `VITE_API_BASE_URL` | `https://your-production-api.com/api/v1` | Production |

#### For Preview (develop/feature branches)

| Variable | Value | Scope |
|----------|-------|-------|
| `VITE_LIFF_ID` | `[DEV_LIFF_ID]` | Preview |
| `VITE_API_BASE_URL` | `https://your-dev-api.com/api/v1` | Preview |

### Branch Configuration

| Branch | Deployment Type | URL |
|--------|-----------------|-----|
| `main` | Production | `security-guard-hrm-saa-s-frontend.vercel.app` |
| `develop` | Preview | `security-guard-hrm-dev.vercel.app` ✅ |
| `feature/*` | Preview | Auto-generated unique URL |

---

## Setting Up Development Environment

### Step 1: Create Development LINE Channel

1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Select your Provider
3. Click **Create a new channel** → **Messaging API**
4. Fill in details:
   - **Channel name**: Security Guard HRM (Dev)
   - **Channel description**: Development environment for Security Guard HRM
5. Enable **LIFF** in the channel settings

### Step 2: Create Development LIFF Apps

For each of these pages, create a LIFF app:

```
/liff/profile   → HRM Profile (Dev)   - Tall
/liff/leave     → HRM Leave (Dev)     - Tall
/liff/schedule  → HRM Schedule (Dev)  - Tall
/liff/clock     → HRM Clock In (Dev)  - Full
/liff/link      → HRM Link (Dev)      - Full (NEW - for account linking)
```

**LIFF App Settings:**
- **Size**: As specified above
- **Scopes**: `openid`, `profile`
- **Add friend option**: On (normal)

### Step 3: Get Vercel Preview URL

1. Create and push `develop` branch:
   ```powershell
   git checkout -b develop
   git push -u origin develop
   ```

2. Vercel will auto-deploy. Find the URL in:
   - Vercel Dashboard → Your Project → Deployments
   - Or in the GitHub Pull Request (if you created one)

3. The URL format will be:
   ```
   https://security-guard-hrm-saa-s-frontend-git-develop-[username].vercel.app
   ```

### Step 4: Update LIFF Endpoint URLs

In LINE Developers Console, update each Dev LIFF app with the preview URL:

```
Endpoint URL: https://[your-preview-url]/liff/clock
```

### Step 5: Set Vercel Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables

2. Add for **Preview** scope:
   ```
   VITE_LIFF_ID = [Your Dev LIFF ID for Clock In]
   VITE_API_BASE_URL = [Your Dev Backend API URL]
   ```

---

## Development Workflow

### Daily Development Flow

```
1. Work on feature branch
   git checkout -b feature/my-feature

2. Push to trigger preview deployment
   git push origin feature/my-feature

3. Vercel creates unique preview URL

4. Test LIFF by opening in LINE app (using dev LIFF URL)

5. Create PR to develop → merge when ready

6. develop branch auto-deploys → test with stable dev LIFF apps

7. Create PR to main → deploy to production
```

### Testing LIFF

**Using Development LIFF Apps:**
1. Copy the Dev LIFF URL: `https://liff.line.me/[DEV_LIFF_ID]`
2. Open in LINE app
3. It will redirect to your Vercel preview deployment

**Using ngrok for local development:**
```powershell
# Terminal 1: Run frontend
npm run dev

# Terminal 2: Expose via ngrok
ngrok http 5173
```
Then temporarily update Dev LIFF endpoint to ngrok URL.

---

## Backend Configuration

The backend also needs environment-specific configuration:

### For LINE Token Verification

The backend verifies LINE ID tokens using the channel ID. Configure:

```env
# Production
LINE_CHANNEL_ID=2008914377
LINE_CHANNEL_SECRET=[production-secret]

# Development
LINE_CHANNEL_ID=[dev-channel-id]
LINE_CHANNEL_SECRET=[dev-secret]
```

### Multi-Channel Support (Optional)

If you want frontend to work with both dev and prod LIFF IDs, backend can accept multiple channel IDs:

```env
LINE_CHANNEL_IDS=2008914377,[dev-channel-id]
```

---

## Troubleshooting

### LIFF initialization fails

- Ensure `VITE_LIFF_ID` is set correctly in Vercel environment
- Check that endpoint URL in LINE Developers matches the deployed URL
- Verify the LIFF app is not disabled

### Token verification fails

- Ensure backend `LINE_CHANNEL_ID` matches the LIFF's channel
- Check that `LINE_CHANNEL_SECRET` is correct

### Preview URL keeps changing

- Use a stable branch like `develop` for your dev LIFF apps
- Or configure a custom domain for preview deployments

---

## Quick Reference

### URLs to Remember

| Purpose | URL |
|---------|-----|
| LINE Developers Console | https://developers.line.biz/ |
| Vercel Dashboard | https://vercel.com/dashboard |
| Production LIFF (Clock) | https://liff.line.me/2008914377-NDoaNvUa |
| Development LIFF (Clock) | https://liff.line.me/[DEV_LIFF_ID] |

### Environment Variable Summary

| Variable | Production | Development |
|----------|-----------|-------------|
| `VITE_LIFF_ID` | Production Clock LIFF ID | Development Clock LIFF ID |
| `VITE_API_BASE_URL` | Production API | Development API |
