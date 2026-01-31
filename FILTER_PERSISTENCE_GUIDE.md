# Hybrid Filter Persistence - User Guide

## How It Works

The attendance page uses a **hybrid persistence system** that combines URL parameters and SessionStorage to ensure your filters are never lost:

**Initialization Priority:**
1. **URL Parameters** (highest) - For sharing and bookmarks
2. **SessionStorage** (fallback) - Preserves filters during sidebar navigation
3. **Default Values** (lowest) - Fresh start

This means:

✅ **Filters persist across page refreshes**
✅ **Filters persist when navigating via sidebar**
✅ **Browser back/forward buttons work with filters**
✅ **You can bookmark filtered views**
✅ **Share filtered links with your team**
✅ **No filters lost when clicking sidebar links**

## Example Usage

### Scenario 1: Filter by Date Range (URL Persistence)

1. Go to `/attendance`
2. Change dates from **01/25/2026** to **01/29/2026**
3. URL automatically updates to:
   ```
   /attendance?startDate=2026-01-25&endDate=2026-01-29&page=1&pageSize=20
   ```
4. **Refresh the page** → Dates are still **01/25/2026** to **01/29/2026** ✅
5. **Navigate away and come back** → Dates are preserved ✅

### Scenario 1a: Sidebar Navigation (SessionStorage Persistence)

1. Apply filters: **01/25/2026** to **01/29/2026**
2. Click sidebar link "Employees" → Navigate to `/employees`
3. Click sidebar link "Attendance" → Navigate to `/attendance` (clean URL, no params)
4. **Filters are restored from SessionStorage** → Dates are still **01/25/2026** to **01/29/2026** ✅
5. URL automatically updates with parameters ✅

### Scenario 2: Filter by Multiple Criteria

1. Set date range: **01/25/2026** to **01/29/2026**
2. Select employee: **John Doe**
3. Select status: **Late**
4. URL updates to:
   ```
   /attendance?startDate=2026-01-25&endDate=2026-01-29&employeeId=abc-123&status=late&page=1&pageSize=20
   ```
5. All filters are preserved when you refresh or return to the page ✅

### Scenario 3: Share Filtered View

1. Apply your desired filters
2. Click the **Share button** (📤 icon)
3. URL is copied to clipboard
4. Share with your colleague
5. When they open the link, they see the exact same filtered view ✅

## What Gets Saved to URL

All filter values are automatically saved:

| Filter | URL Parameter | Example |
|--------|---------------|---------|
| Date Range | `startDate`, `endDate` | `startDate=2026-01-25&endDate=2026-01-29` |
| Employee | `employeeId` | `employeeId=abc-123` |
| Site | `siteId` | `siteId=site-456` |
| Status | `status` | `status=late` |
| GPS Accuracy | `maxAccuracy` | `maxAccuracy=30` |
| Page | `page` | `page=2` |
| Page Size | `pageSize` | `pageSize=50` |

## Testing the Feature

### Test 1: Basic URL Persistence
```
1. Open http://localhost:5173/attendance
2. Change startDate to 2026-01-25
3. Change endDate to 2026-01-29
4. Check URL contains: ?startDate=2026-01-25&endDate=2026-01-29
5. Press F5 to refresh
6. Verify dates are still 01/25/2026 to 01/29/2026 ✅
```

### Test 2: Browser Navigation
```
1. Apply filters (dates: 01/25 to 01/29, status: late)
2. Check URL: ?startDate=2026-01-25&endDate=2026-01-29&status=late
3. Navigate to /employees
4. Click browser back button
5. Verify you're back at /attendance with filters intact ✅
```

### Test 3: Sidebar Navigation (NEW - SessionStorage)
```
1. Open http://localhost:5173/attendance
2. Apply filters: dates 01/25 to 01/29, status: late
3. Check URL has parameters
4. Click "Employees" in sidebar
5. You're now at /employees (clean URL)
6. Click "Attendance" in sidebar
7. You're now at /attendance (initially clean URL)
8. Filters are automatically restored from SessionStorage ✅
9. URL updates with parameters ✅
```

### Test 3: Direct URL Access
```
1. Copy this URL:
   http://localhost:5173/attendance?startDate=2026-01-01&endDate=2026-01-31&status=late

2. Open in new tab
3. Verify filters are applied:
   - Dates: 01/01/2026 to 01/31/2026
   - Status: Late
```

### Test 4: Clear Filters
```
1. Apply multiple filters
2. URL has many parameters
3. Click "Clear Filters" button
4. URL resets to: /attendance?startDate=<today>&endDate=<today>&page=1&pageSize=20
5. All filters reset to defaults
```

### Test 5: Share Button
```
1. Apply filters (dates: 01/25 to 01/29)
2. Click Share button (📤)
3. See "คัดลอกแล้ว!" (Copied!) message
4. Paste from clipboard
5. Verify URL contains all active filters
```

## Troubleshooting

### Issue: Filters not persisting

**Check:**
1. Are you seeing URL parameters in the address bar?
   - Yes → Feature is working
   - No → JavaScript may not be running

2. Open browser console (F12)
   - Look for errors related to `useUrlFilters` or `URLSearchParams`

3. Try clearing browser cache and reload

### Issue: URL shows parameters but filters reset

**Check:**
1. Verify `isInitialized` is true before rendering
2. Check browser console for errors
3. Ensure you're using the latest build

### Issue: Shared links don't work

**Check:**
1. Copy the full URL including domain
   - ✅ Correct: `http://localhost:5173/attendance?startDate=2026-01-25`
   - ❌ Wrong: `/attendance?startDate=2026-01-25`

2. Ensure all query parameters are properly encoded
3. Test in incognito mode to rule out cache issues

## Technical Details

### Hybrid Persistence Flow

```
┌─────────────────────────────────────────────────┐
│ User opens /attendance                          │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ 1. Check URL Parameters                         │
│    Has ?startDate=2026-01-25&endDate=2026-01-29 │
└─────────────┬───────────────────────────────────┘
              │
              ├──YES──► Use URL parameters (highest priority)
              │
              └──NO───┐
                      ▼
              ┌─────────────────────────────────────┐
              │ 2. Check SessionStorage              │
              │    Key: "attendanceFilters"          │
              └─────────┬───────────────────────────┘
                        │
                        ├──YES──► Use SessionStorage (fallback)
                        │         Then update URL with filters
                        │
                        └──NO───► Use defaults (fresh start)
```

### Data Storage

**URL Parameters:**
```typescript
// URL Query String
?startDate=2026-01-25&endDate=2026-01-29&status=late&page=1

// Becomes Filter Object
{
  startDate: "2026-01-25",
  endDate: "2026-01-29",
  status: "late",
  page: 1,
  pageSize: 20
}
```

**SessionStorage:**
```typescript
// Key: "attendanceFilters"
// Value: JSON string
{
  "startDate": "2026-01-25",
  "endDate": "2026-01-29",
  "status": "late",
  "page": 1,
  "pageSize": 20
}
```

### Type Parsing

The hook automatically parses URL strings to correct types:

```typescript
// String parameters (default)
?employeeId=abc-123  → employeeId: "abc-123"
?status=late         → status: "late"

// Number parameters (with parser)
?page=2              → page: 2
?pageSize=50         → pageSize: 50
?maxAccuracy=30      → maxAccuracy: 30

// Undefined/missing parameters
?startDate=2026-01-25  → { startDate: "2026-01-25", employeeId: undefined }
```

### URL Updates

- Uses `replaceState` (no browser history entry)
- Debounced to prevent excessive updates
- Only includes non-null/undefined values
- Automatic serialization of complex types

## Best Practices

### For Users

1. **Bookmark common filter combinations**
   - Example: "Late arrivals this month"
   - Saves time re-filtering each day

2. **Share filtered reports with managers**
   - Click share button
   - Send link via LINE/email
   - Recipient sees exact same view

3. **Use browser navigation**
   - Back/forward buttons work
   - No need to re-apply filters

### For Developers

1. **Always check `isInitialized`**
   ```typescript
   if (!isInitialized) return <Loading />;
   ```

2. **Reset to page 1 when changing filters**
   ```typescript
   setFilters({
     status: 'late',
     page: 1  // Reset pagination
   });
   ```

3. **Use meaningful defaults**
   ```typescript
   defaults: {
     startDate: new Date().toISOString().split('T')[0],
     status: undefined  // Don't filter by default
   }
   ```

## Examples in Code

### Reading Current Filters
```typescript
console.log('Current filters:', filters);
// { startDate: "2026-01-25", endDate: "2026-01-29", status: "late" }
```

### Updating Single Filter
```typescript
setFilter('status', 'on_time');
// URL updates to: ?...&status=on_time
```

### Updating Multiple Filters
```typescript
setFilters({
  startDate: '2026-02-01',
  endDate: '2026-02-28',
  page: 1
});
// URL updates with all new values
```

### Resetting All Filters
```typescript
resetFilters();
// URL resets to defaults
```

### Building Shareable URL
```typescript
const url = buildShareableUrl('/attendance', filters);
// Returns: "http://localhost:5173/attendance?startDate=2026-01-25&..."
```

## Browser Compatibility

✅ Chrome/Edge (Chromium)
✅ Firefox
✅ Safari
✅ Mobile browsers

**Requirements:**
- JavaScript enabled
- URLSearchParams API support (all modern browsers)
- Clipboard API for share button (HTTPS or localhost only)

## Privacy & Security

- All filter data is **client-side only**
- No server-side storage of URL parameters
- URLs can be shared safely (no sensitive data)
- Standard URL encoding for special characters

## Future Enhancements

Potential improvements:
- [ ] Named filter presets
- [ ] Filter history (last 5 combinations)
- [ ] QR codes for mobile sharing
- [ ] Filter validation with error messages
- [ ] Export filters as JSON
