# Background Jobs (Cron Scheduler)

This directory contains background jobs that run periodically using node-cron.

## Available Jobs

### 1. Shift Reminders (`lineNotifications.ts`)
- **Schedule**: Every hour (0 * * * *)
- **Purpose**: Send LINE notifications to employees about upcoming shifts
- **Look-ahead**: 2 hours
- **Function**: `sendShiftReminders(hoursAhead: number)`

### 2. No-Show Detection (`noShowDetection.ts`)
- **Schedule**: Every 30 minutes (*/30 * * * *)
- **Purpose**: Automatically mark employees as 'no_show' if they haven't clocked in
- **Grace Period**: 30 minutes after shift start
- **Function**: `detectNoShows(gracePeriodMinutes: number)`
- **Notifications**: Sends LINE alerts to managers/admins when no-shows are detected

**Logic:**
1. Find all shifts that started 30+ minutes ago
2. Check if attendance record exists for each shift
3. If no attendance record, create one with status 'no_show'
4. Send LINE notification to company managers/admins
5. Add system note explaining the auto-detection

### 3. Missed Clock-Out Detection (`noShowDetection.ts`)
- **Schedule**: Every hour at minute 15 (15 * * * *)
- **Purpose**: Mark attendance as 'early_leave' if employee clocked in but didn't clock out
- **Grace Period**: 1 hour after shift end
- **Function**: `detectMissedClockOuts(hoursAfterEnd: number)`

**Logic:**
1. Find attendance records with clock-in but no clock-out
2. Check if shift ended 1+ hours ago
3. Update status to 'early_leave'
4. Add system note explaining the auto-detection

### 4. License Compliance Check (`licenseChecker.ts`)
- **Schedule**: Daily at midnight (0 0 * * *)
- **Purpose**: Verify company licenses and seat limits
- **Function**: `checkLicenses()`

## Configuration

### Cron Schedule Format
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-6, Sunday to Saturday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Examples
- `* * * * *` - Every minute
- `*/10 * * * *` - Every 10 minutes
- `0 * * * *` - Every hour
- `*/30 * * * *` - Every 30 minutes
- `15 * * * *` - Every hour at minute 15
- `0 0 * * *` - Daily at midnight
- `0 9 * * 1-5` - Weekdays at 9 AM

## Customization

### Adjusting Grace Periods

**No-Show Detection:**
Edit `scheduler.ts` to change the grace period:
```typescript
// Current: 30 minutes
const result = await detectNoShows(30);

// Change to 15 minutes
const result = await detectNoShows(15);

// Change to 60 minutes (1 hour)
const result = await detectNoShows(60);
```

**Missed Clock-Out Detection:**
Edit `scheduler.ts` to change the hours after shift end:
```typescript
// Current: 1 hour
const result = await detectMissedClockOuts(1);

// Change to 2 hours
const result = await detectMissedClockOuts(2);

// Change to 4 hours
const result = await detectMissedClockOuts(4);
```

### Adjusting Schedule Frequency

Edit `scheduler.ts` and change the cron pattern:

```typescript
// Current: Every 30 minutes
cron.schedule('*/30 * * * *', async () => { ... });

// Change to every 15 minutes
cron.schedule('*/15 * * * *', async () => { ... });

// Change to every hour
cron.schedule('0 * * * *', async () => { ... });

// Change to specific times (e.g., 8 AM, 12 PM, 4 PM)
cron.schedule('0 8,12,16 * * *', async () => { ... });
```

## Testing

### Running Jobs Manually

You can test jobs individually without waiting for the scheduler:

```typescript
import { detectNoShows, detectMissedClockOuts } from './jobs';

// Test no-show detection with 30 min grace period
const result = await detectNoShows(30);
console.log('No-shows detected:', result);

// Test missed clock-out detection with 1 hour grace period
const result2 = await detectMissedClockOuts(1);
console.log('Missed clock-outs:', result2);
```

### Viewing Job Execution Logs

All jobs log their activity to the application logger. Check logs for:
- Job start/completion times
- Records detected/processed
- Errors and warnings
- Notification results

Example log output:
```
[INFO] Starting no-show detection job
[INFO] Found 15 shifts to check for no-shows
[INFO] No-show detected: Employee John Doe, Shift 08:00-16:00
[INFO] Created no-show attendance record
[INFO] No-show detection job completed: detected=3, marked=3, notified=5, errors=0
```

## Monitoring & Alerts

### Success Metrics
- `detected`: Number of no-shows/missed clock-outs found
- `marked`: Number of attendance records created/updated
- `notified`: Number of LINE notifications sent
- `errors`: Number of errors encountered

### Error Handling
All jobs include error handling to prevent one failure from stopping the entire scheduler. Errors are logged but jobs continue running on schedule.

### Health Checks
Monitor the following to ensure jobs are running correctly:
1. Check application logs for regular job execution
2. Verify attendance records are being auto-created
3. Confirm LINE notifications are being sent to managers
4. Review error counts in job completion logs

## Database Impact

### No-Show Detection
- **Reads**: Queries `shifts` and `attendance_logs` tables
- **Writes**: Inserts new records into `attendance_logs`
- **Estimated Load**: Low (typically <100 shifts per run)

### Missed Clock-Out Detection
- **Reads**: Queries `attendance_logs` with joins to `shifts`
- **Writes**: Updates existing `attendance_logs` records
- **Estimated Load**: Low (typically <50 records per run)

## Timezone Considerations

All jobs respect company timezone settings. Date/time comparisons use the company's configured timezone to ensure accurate shift detection.

## Future Enhancements

Potential improvements:
1. Configurable grace periods per company
2. Different grace periods based on shift type
3. Escalation notifications (reminder after 15 min, alert after 30 min)
4. Dashboard showing no-show trends
5. Predictive analytics for high-risk no-shows
6. Integration with third-party attendance systems

## Troubleshooting

### Job Not Running
- Verify scheduler is initialized in `server.ts`
- Check for syntax errors in cron pattern
- Review application startup logs

### No Records Detected
- Verify shifts exist with correct status ('confirmed' or 'pending')
- Check shift start times match current date/time
- Ensure grace period hasn't expired yet

### Notifications Not Sent
- Verify LINE is configured (CHANNEL_ID, CHANNEL_SECRET, ACCESS_TOKEN)
- Check managers have linked LINE accounts
- Review notification preferences (enabled/disabled)
- Check quiet hours settings

### Duplicate No-Show Records
- Ensure job runs at appropriate interval (30 min recommended)
- Verify database queries check for existing records
- Review logs for race conditions
