# Frontend Utilities

## Date Formatting (`dateFormat.ts`)

Thai-specific date and time formatting utilities with Buddhist Era (พ.ศ.) support.

### Features

- **Thai Buddhist Era Conversion**: Automatically converts Gregorian years to Buddhist Era (CE + 543)
- **Multiple Format Styles**: short, medium, long, and full formats
- **Bilingual Support**: Works seamlessly with both Thai and English
- **Null Safety**: Handles null/undefined values gracefully
- **Type Safety**: Full TypeScript support

### Functions

#### `formatThaiDate(dateStr, format)`

Format date in Thai Buddhist Era format.

```typescript
import { formatThaiDate } from '@/utils/dateFormat';

// Different formats
formatThaiDate('2024-01-29', 'short');   // "29 ม.ค. 67"
formatThaiDate('2024-01-29', 'medium');  // "29 ม.ค. 2567"
formatThaiDate('2024-01-29', 'long');    // "29 มกราคม 2567"
formatThaiDate('2024-01-29', 'full');    // "วันจันทร์ที่ 29 มกราคม พ.ศ. 2567"
```

**Parameters:**
- `dateStr`: ISO date string or Date object
- `format`: 'short' | 'medium' | 'long' | 'full' (default: 'medium')

**Returns:** Formatted Thai date string

#### `formatThaiTime(timeStr, includeSeconds)`

Format time in Thai format (24-hour).

```typescript
import { formatThaiTime } from '@/utils/dateFormat';

formatThaiTime('2024-01-29T08:30:00Z');           // "08:30 น."
formatThaiTime('2024-01-29T14:45:30Z', true);     // "14:45:30 น."
```

**Parameters:**
- `timeStr`: ISO time string or Date object
- `includeSeconds`: boolean (default: false)

**Returns:** Formatted time string with "น." suffix

#### `formatThaiDateTime(dateStr, dateFormat, includeSeconds)`

Format date and time together.

```typescript
import { formatThaiDateTime } from '@/utils/dateFormat';

formatThaiDateTime('2024-01-29T08:30:00Z');
// "29 ม.ค. 2567 เวลา 08:30 น."

formatThaiDateTime('2024-01-29T14:45:30Z', 'long', true);
// "29 มกราคม 2567 เวลา 14:45:30 น."
```

#### `formatThaiDateRange(startDate, endDate, format)`

Format date ranges intelligently.

```typescript
import { formatThaiDateRange } from '@/utils/dateFormat';

// Same year optimization
formatThaiDateRange('2024-01-29', '2024-02-05', 'medium');
// "29 ม.ค. - 5 ก.พ. 2567"

// Different years
formatThaiDateRange('2023-12-29', '2024-01-05', 'medium');
// "29 ธ.ค. 2566 - 5 ม.ค. 2567"

// Same date
formatThaiDateRange('2024-01-29', '2024-01-29', 'medium');
// "29 ม.ค. 2567"
```

#### `formatThaiDuration(hours)`

Format duration in Thai.

```typescript
import { formatThaiDuration } from '@/utils/dateFormat';

formatThaiDuration(8);      // "8 ชั่วโมง"
formatThaiDuration(8.5);    // "8.5 ชั่วโมง"
formatThaiDuration(0.5);    // "30 นาที"
```

#### `formatThaiRelativeDate(dateStr)`

Format relative dates in Thai.

```typescript
import { formatThaiRelativeDate } from '@/utils/dateFormat';

formatThaiRelativeDate(today);           // "วันนี้"
formatThaiRelativeDate(yesterday);       // "เมื่อวาน"
formatThaiRelativeDate(tomorrow);        // "พรุ่งนี้"
formatThaiRelativeDate(twoDaysAgo);      // "2 วันที่แล้ว"
formatThaiRelativeDate(inThreeDays);     // "ใน 3 วัน"
```

#### `getThaiDayName(dateStr, short)`

Get Thai day name.

```typescript
import { getThaiDayName } from '@/utils/dateFormat';

getThaiDayName('2024-01-29', true);   // "จ."
getThaiDayName('2024-01-29', false);  // "จันทร์"
```

### Usage Examples

#### Component with Language Detection

```typescript
import { formatThaiDate, formatThaiTime } from '@/utils/dateFormat';
import { useTranslation } from 'react-i18next';

function AttendanceRow({ record }) {
  const { i18n } = useTranslation();
  const isThaiLanguage = i18n.language === 'th';

  const formatDate = (dateStr) => {
    if (isThaiLanguage) {
      return formatThaiDate(dateStr, 'medium');
    }
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr) => {
    if (isThaiLanguage) {
      return formatThaiTime(timeStr);
    }
    return new Date(timeStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div>
      <span>{formatDate(record.date)}</span>
      <span>{formatTime(record.clockInTime)}</span>
    </div>
  );
}
```

#### Display Date Range

```typescript
import { formatThaiDateRange } from '@/utils/dateFormat';

function LeaveRequest({ request }) {
  return (
    <div>
      <span>
        {formatThaiDateRange(
          request.startDate,
          request.endDate,
          'medium'
        )}
      </span>
    </div>
  );
}
```

### Buddhist Era Reference

| Gregorian Year | Buddhist Era |
|----------------|--------------|
| 2024           | 2567         |
| 2025           | 2568         |
| 2026           | 2569         |

**Conversion Formula:** Buddhist Era = Gregorian Year + 543

### Month Names

| English    | Thai (Short) | Thai (Full) |
|------------|--------------|-------------|
| January    | ม.ค.         | มกราคม      |
| February   | ก.พ.         | กุมภาพันธ์  |
| March      | มี.ค.        | มีนาคม      |
| April      | เม.ย.        | เมษายน      |
| May        | พ.ค.         | พฤษภาคม     |
| June       | มิ.ย.        | มิถุนายน    |
| July       | ก.ค.         | กรกฎาคม     |
| August     | ส.ค.         | สิงหาคม     |
| September  | ก.ย.         | กันยายน     |
| October    | ต.ค.         | ตุลาคม      |
| November   | พ.ย.         | พฤศจิกายน   |
| December   | ธ.ค.         | ธันวาคม     |

### Day Names

| English   | Thai (Short) | Thai (Full) |
|-----------|--------------|-------------|
| Sunday    | อา.          | อาทิตย์     |
| Monday    | จ.           | จันทร์      |
| Tuesday   | อ.           | อังคาร      |
| Wednesday | พ.           | พุธ         |
| Thursday  | พฤ.          | พฤหัสบดี    |
| Friday    | ศ.           | ศุกร์       |
| Saturday  | ส.           | เสาร์       |

## URL Filters Hook (`../hooks/useUrlFilters.ts`)

Custom React hook for **hybrid filter persistence** with URL and SessionStorage.

### Features

- **Hybrid Persistence**: URL parameters + SessionStorage fallback
- **Sidebar Navigation**: Filters persist when clicking sidebar links
- **Browser Navigation**: Full support for back/forward buttons
- **Shareable Links**: Generate shareable URLs with active filters
- **Type Safety**: Full TypeScript support with custom parsers
- **Default Values**: Automatic fallback to defaults

### Initialization Priority

The hook uses a smart initialization strategy:

1. **URL Parameters** (highest priority) - For sharing and bookmarks
2. **SessionStorage** (fallback) - Preserves filters during sidebar navigation
3. **Default Values** (lowest priority) - Fresh start

This ensures filters are never lost, even when navigating via sidebar links that don't preserve URL parameters.

### Basic Usage

```typescript
import { useUrlFilters } from '@/hooks/useUrlFilters';

function MyPage() {
  const {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    isInitialized,
  } = useUrlFilters({
    defaults: {
      page: 1,
      pageSize: 20,
      search: '',
      status: undefined,
    },
    storageKey: 'myPageFilters', // Unique key for SessionStorage
    parser: {
      page: (v) => parseInt(v, 10),
      pageSize: (v) => parseInt(v, 10),
    },
  });

  // Use filters in your component
  if (!isInitialized) return <Loading />;

  return (
    <div>
      <input
        value={filters.search}
        onChange={(e) => setFilter('search', e.target.value)}
      />
      <button onClick={resetFilters}>Clear Filters</button>
    </div>
  );
}
```

### How It Works

**Scenario 1: Direct URL Access**
```
User opens: /attendance?startDate=2026-01-25&endDate=2026-01-29
→ Hook reads URL parameters
→ Filters: { startDate: "2026-01-25", endDate: "2026-01-29", ... }
→ Saves to SessionStorage
```

**Scenario 2: Sidebar Navigation**
```
User filters attendance page, then clicks sidebar "Employees"
→ Filters saved to SessionStorage
→ User clicks sidebar "Attendance" (/attendance with no params)
→ Hook checks URL (no params)
→ Hook checks SessionStorage (filters found!)
→ Filters restored: { startDate: "2026-01-25", endDate: "2026-01-29", ... }
→ URL updated with parameters
```

### Advanced Example with Multiple Filters

```typescript
import { useUrlFilters, copyFiltersToClipboard } from '@/hooks/useUrlFilters';

function AttendancePage() {
  const {
    filters,
    setFilter,
    setFilters,
    resetFilters,
  } = useUrlFilters({
    defaults: {
      page: 1,
      pageSize: 20,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      employeeId: undefined,
      status: undefined,
    },
    parser: {
      page: (v) => parseInt(v, 10),
      pageSize: (v) => parseInt(v, 10),
    },
  });

  const handleDateChange = (start, end) => {
    setFilters({
      startDate: start,
      endDate: end,
      page: 1, // Reset to first page
    });
  };

  const handleShare = async () => {
    await copyFiltersToClipboard(filters);
    alert('Link copied!');
  };

  return (
    <div>
      {/* Your filters UI */}
      <button onClick={handleShare}>Share Filters</button>
    </div>
  );
}
```

### API Reference

#### `useUrlFilters<T>(options)`

**Options:**
```typescript
interface UseUrlFiltersOptions<T> {
  defaults: T;                           // Default filter values
  storageKey?: string;                   // SessionStorage key (default: 'urlFilters')
  parser?: Partial<Record<keyof T, (v: string) => any>>;   // Custom parsers
  serializer?: Partial<Record<keyof T, (v: any) => string>>; // Custom serializers
  debounceMs?: number;                   // Debounce URL updates (ms)
}
```

**Returns:**
```typescript
{
  filters: T;                          // Current filter values
  setFilter: (key, value) => void;     // Update single filter
  setFilters: (updates) => void;       // Update multiple filters
  resetFilters: () => void;            // Reset to defaults
  isInitialized: boolean;              // URL parsing complete
}
```

#### `copyFiltersToClipboard(filters)`

Copy current page URL with filters to clipboard.

```typescript
await copyFiltersToClipboard({
  startDate: '2024-01-01',
  status: 'late'
});
// Copies: https://example.com/attendance?startDate=2024-01-01&status=late
```

#### `buildShareableUrl(baseUrl, filters)`

Build shareable URL with filters.

```typescript
const url = buildShareableUrl('/attendance', {
  startDate: '2024-01-01',
  status: 'late'
});
// Returns: "https://example.com/attendance?startDate=2024-01-01&status=late"
```

### URL Format

Filters are encoded as URL query parameters:

```
/attendance?page=1&pageSize=20&startDate=2024-01-01&endDate=2024-01-31&status=late
```

**Rules:**
- Undefined values are omitted from URL
- Null values are omitted from URL
- Values equal to defaults are omitted (keeps URL clean)
- Changes use `replaceState` (no navigation)

### Custom Parsers & Serializers

```typescript
const { filters } = useUrlFilters({
  defaults: {
    tags: [] as string[],
    priority: 1,
  },
  parser: {
    tags: (v) => v.split(','),
    priority: (v) => parseInt(v, 10),
  },
  serializer: {
    tags: (v) => (v as string[]).join(','),
    priority: (v) => String(v),
  },
});
```

### Best Practices

1. **Always check `isInitialized`** before rendering content that depends on filters
2. **Reset to page 1** when changing search filters
3. **Use meaningful defaults** that make sense for your use case
4. **Keep URLs clean** by only including non-default values
5. **Test back/forward navigation** to ensure proper behavior

### Integration Example

Full example combining date formatting and URL filters:

```typescript
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { formatThaiDate, formatThaiTime } from '@/utils/dateFormat';
import { useTranslation } from 'react-i18next';

function AttendancePage() {
  const { i18n } = useTranslation();
  const isThaiLanguage = i18n.language === 'th';

  const { filters, setFilter, resetFilters } = useUrlFilters({
    defaults: {
      page: 1,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
  });

  const formatDate = (dateStr) => {
    if (isThaiLanguage) {
      return formatThaiDate(dateStr, 'medium');
    }
    return new Date(dateStr).toLocaleDateString('en-US');
  };

  return (
    <div>
      <h1>
        Attendance: {formatDate(filters.startDate)} - {formatDate(filters.endDate)}
      </h1>
      {/* Rest of your component */}
    </div>
  );
}
```
