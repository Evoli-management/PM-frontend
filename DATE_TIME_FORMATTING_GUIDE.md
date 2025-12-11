# Date & Time Format Integration Guide

Complete guide for using consistent date and time formatting throughout the Practical Manager application based on user preferences.

---

## Quick Start

### In Any Component

```jsx
import { useFormattedDate } from '../hooks/useFormattedDate';

function MyComponent() {
    const { formatDate, formatTime, formatDateTime } = useFormattedDate();
    
    return (
        <div>
            <p>Today: {formatDate(new Date())}</p>
            <p>Meeting at: {formatTime('14:30')}</p>
            <p>Event: {formatDateTime(new Date())}</p>
        </div>
    );
}
```

---

## Architecture

### Service Layer: `dateTimeFormatterService`

The core formatting service handles all date/time formatting operations:

```javascript
import dateTimeFormatterService from '../services/dateTimeFormatterService';

// Async formatting (recommended for initial loads)
const formatted = await dateTimeFormatterService.formatDate(new Date());

// Sync formatting (for rendering within components)
const formatted = dateTimeFormatterService.formatDateSync(new Date(), 'MM/dd/yyyy');
```

**Features:**
- Automatic preference caching (5-minute TTL)
- Support for 4 date formats
- Support for 12h/24h time formats
- Relative date formatting (Today, Tomorrow, etc.)
- Utility functions (time to minutes, minutes to time)

### Hook Layer: `useFormattedDate`

React hook that wraps the service and listens for preference changes:

```javascript
const { formatDate, formatTime, dateFormat, timeFormat } = useFormattedDate();
```

**Provides:**
- Formatted date/time functions
- Current user preferences
- Utility methods
- Available format options
- Auto-updates when preferences change

---

## Supported Formats

### Date Formats

| Format | Display | Example |
|--------|---------|---------|
| `MM/dd/yyyy` | US Format | 12/25/2024 |
| `dd/MM/yyyy` | European Format | 25/12/2024 |
| `yyyy-MM-dd` | ISO Format | 2024-12-25 |
| `MMM dd, yyyy` | Long Format | Dec 25, 2024 |

### Time Formats

| Format | Display | Example |
|--------|---------|---------|
| `12h` | 12-Hour | 2:30 PM |
| `24h` | 24-Hour | 14:30 |

---

## Component Integration Examples

### Calendar Views (DayView, WeekView, MonthView)

```jsx
// Before: Hardcoded format
<div>{date.toLocaleDateString()}</div>

// After: Uses user preference
import { useFormattedDate } from '../hooks/useFormattedDate';

function CalendarHeader({ date }) {
    const { formatDate } = useFormattedDate();
    return <div>{formatDate(date)}</div>;
}
```

### Appointments/Events Display

```jsx
import { useFormattedDate } from '../hooks/useFormattedDate';

function AppointmentCard({ appointment }) {
    const { formatDateTime, formatTime } = useFormattedDate();
    
    return (
        <div>
            <p>{appointment.title}</p>
            <p>{formatDateTime(appointment.start)}</p>
            <p>Duration: {formatTime(appointment.duration)}</p>
        </div>
    );
}
```

### Goals Display

```jsx
import { useFormattedDate } from '../hooks/useFormattedDate';

function GoalCard({ goal }) {
    const { formatDate, formatRelativeDate } = useFormattedDate();
    
    return (
        <div>
            <p>{goal.name}</p>
            <p>Due: {formatDate(goal.dueDate)} ({formatRelativeDate(goal.dueDate)})</p>
        </div>
    );
}
```

### Tasks/To-Do Display

```jsx
import { useFormattedDate } from '../hooks/useFormattedDate';

function TaskCard({ task }) {
    const { formatDate, formatTime } = useFormattedDate();
    
    return (
        <div>
            <p>{task.title}</p>
            <p>Deadline: {formatDate(task.deadline)}</p>
            {task.reminderTime && <p>Remind: {formatTime(task.reminderTime)}</p>}
        </div>
    );
}
```

### Dashboard Widgets

```jsx
import { useFormattedDate } from '../hooks/useFormattedDate';

function UpcomingEventsWidget() {
    const { formatDateTime } = useFormattedDate();
    
    return (
        <div>
            {events.map(event => (
                <div key={event.id}>
                    {event.name} - {formatDateTime(event.start)}
                </div>
            ))}
        </div>
    );
}
```

### Reports & Analytics

```jsx
import { useFormattedDate } from '../hooks/useFormattedDate';

function ReportView({ data, startDate, endDate }) {
    const { formatDate, formatDateTime } = useFormattedDate();
    
    return (
        <div>
            <h2>Report from {formatDate(startDate)} to {formatDate(endDate)}</h2>
            {data.map(entry => (
                <tr key={entry.id}>
                    <td>{entry.name}</td>
                    <td>{formatDateTime(entry.timestamp)}</td>
                </tr>
            ))}
        </div>
    );
}
```

---

## API Reference

### `dateTimeFormatterService`

#### `formatDate(date, dateFormat?)`
Formats a date according to user preference.
```javascript
const formatted = await dateTimeFormatterService.formatDate(new Date());
// Returns: "12/25/2024" (or based on user preference)
```

#### `formatDateSync(date, dateFormat?)`
Synchronous date formatting (no async).
```javascript
const formatted = dateTimeFormatterService.formatDateSync(new Date(), 'MM/dd/yyyy');
// Returns: "12/25/2024"
```

#### `formatTime(timeStr, timeFormat?)`
Formats time according to user preference.
```javascript
const formatted = await dateTimeFormatterService.formatTime('14:30');
// Returns: "2:30 PM" (or "14:30" if user prefers 24h)
```

#### `formatTimeSync(timeStr, timeFormat?)`
Synchronous time formatting.
```javascript
const formatted = dateTimeFormatterService.formatTimeSync('14:30', '12h');
// Returns: "2:30 PM"
```

#### `formatDateTime(dateTime, options?)`
Formats date and time together.
```javascript
const formatted = await dateTimeFormatterService.formatDateTime(new Date(), {
    separator: ' at ' // customizable separator
});
// Returns: "12/25/2024 at 2:30 PM"
```

#### `formatRelativeDate(date)`
Formats date as relative (Today, Tomorrow, Yesterday, etc.).
```javascript
const formatted = dateTimeFormatterService.formatRelativeDate(new Date());
// Returns: "Today" or "Tomorrow" etc.
```

#### `getDateFormatPattern(format?)`
Gets the display pattern for a date format.
```javascript
const pattern = dateTimeFormatterService.getDateFormatPattern('MM/dd/yyyy');
// Returns: "MM/DD/YYYY"
```

#### `getExampleDate(format?)`
Gets an example date for a format.
```javascript
const example = dateTimeFormatterService.getExampleDate('dd/MM/yyyy');
// Returns: "25/12/2024"
```

#### `getDateFormats()`
Returns all available date formats.
```javascript
const formats = dateTimeFormatterService.getDateFormats();
// Returns: [{ value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (US)', example: '12/25/2024' }, ...]
```

#### `invalidateCache()`
Clears the preferences cache (call after preferences change).
```javascript
dateTimeFormatterService.invalidateCache();
```

---

### `useFormattedDate()` Hook

Returns an object with:

```javascript
{
    // Formatting functions
    formatDate(date),              // Format date according to preference
    formatTime(timeStr),           // Format time according to preference
    formatDateTime(dateTime, opts), // Format both date and time
    formatRelativeDate(date),      // Get relative date ("Today", etc.)
    
    // Current preferences
    dateFormat: 'MM/dd/yyyy',      // User's current date format
    timeFormat: '12h',             // User's current time format
    
    // Utility functions
    getDateFormatPattern(fmt?),    // Get pattern for format
    getExampleDate(fmt?),          // Get example date
    getExampleTime(fmt?),          // Get example time
    timeToMinutes(timeStr),        // Convert time to minutes
    minutesToTime(minutes),        // Convert minutes to time
    
    // Available formats
    dateFormats: [],               // All available date formats
    timeFormats: []                // All available time formats
}
```

---

## Real-Time Updates

The formatter automatically updates when preferences change via:

1. **Event Broadcasting:**
   - `dateFormatChanged` - When user changes date format
   - `timeFormatChanged` - When user changes time format
   - `calendarPreferencesChanged` - When any preference changes

2. **Cache Invalidation:**
   - Automatic cache refresh on preference changes
   - 5-minute cache TTL for performance

3. **Hook Re-renders:**
   - Components using `useFormattedDate()` automatically re-render
   - All formatted values update instantly

---

## Implementation Checklist

### Calendar Components
- [ ] DayView - Header date, time slots
- [ ] WeekView - Week range, day headers, time slots
- [ ] MonthView - Month header, date cells
- [ ] Time picker displays
- [ ] Appointment times

### Appointment Components
- [ ] Appointment cards
- [ ] Appointment details
- [ ] Appointment creation form
- [ ] Appointment edit form
- [ ] Appointment list views

### Goal Components
- [ ] Goal cards
- [ ] Goal details
- [ ] Goal deadline display
- [ ] Goal milestone dates
- [ ] Goal progress timeline

### Task Components
- [ ] Task cards
- [ ] Task details
- [ ] Task deadline display
- [ ] Task creation form
- [ ] Task list views

### Dashboard
- [ ] Upcoming events widget
- [ ] Goal progress widget
- [ ] Activity timeline
- [ ] Reminder notifications
- [ ] Last login timestamp

### Other Areas
- [ ] Reports and analytics
- [ ] Activity logs
- [ ] Notification timestamps
- [ ] Profile information
- [ ] Settings and preferences

---

## Performance Considerations

### Caching Strategy
- Preferences cached for 5 minutes
- Cache invalidated on preference changes
- Reduces API calls significantly

### Rendering Optimization
- Use sync formatting within components (already loaded)
- Use async formatting only on initial load
- Memoize format functions with useCallback

### Best Practices
```javascript
// ✅ Good: Memoized formatting
const { formatDate } = useFormattedDate();
const formatted = useMemo(() => formatDate(date), [formatDate, date]);

// ✅ Good: Sync formatting in render
const { formatDate } = useFormattedDate();
return <div>{formatDate(date)}</div>;

// ❌ Avoid: Async in render
const formatted = await dateTimeFormatterService.formatDate(date);
```

---

## Testing

### Unit Tests Example
```javascript
import dateTimeFormatterService from '../services/dateTimeFormatterService';

describe('dateTimeFormatterService', () => {
    it('formats date in MM/dd/yyyy', () => {
        const result = dateTimeFormatterService.formatDateSync(
            new Date(2024, 11, 25),
            'MM/dd/yyyy'
        );
        expect(result).toBe('12/25/2024');
    });
    
    it('formats time in 12h', () => {
        const result = dateTimeFormatterService.formatTimeSync('14:30', '12h');
        expect(result).toBe('2:30 PM');
    });
});
```

### Component Tests Example
```javascript
import { render, screen } from '@testing-library/react';
import { useFormattedDate } from '../hooks/useFormattedDate';

function TestComponent() {
    const { formatDate } = useFormattedDate();
    return <div>{formatDate(new Date(2024, 11, 25))}</div>;
}

it('uses user preference for date formatting', () => {
    render(<TestComponent />);
    // Assert formatted according to preference
});
```

---

## Migration from Old Code

### Before
```jsx
// Hardcoded formats scattered throughout
<p>{date.toLocaleDateString()}</p>
<p>{date.toLocaleTimeString()}</p>
<p>{new Intl.DateTimeFormat('en-US').format(date)}</p>
```

### After
```jsx
// Consistent formatting using hook
import { useFormattedDate } from '../hooks/useFormattedDate';

const { formatDate, formatTime } = useFormattedDate();
<p>{formatDate(date)}</p>
<p>{formatTime(timeStr)}</p>
```

---

## Troubleshooting

### "Preferences not updating"
- Check that `window.addEventListener` is working
- Verify event is dispatched correctly: `window.dispatchEvent(new CustomEvent('dateFormatChanged', ...))`
- Call `invalidateCache()` after changes

### "Wrong format showing"
- Check user preferences in browser DevTools
- Verify preferences are saved to backend
- Check `dateFormat` and `timeFormat` values

### "Time picker validation error"
- Ensure TimePicker returns HH:MM format (24-hour internally)
- Backend validates format with regex: `/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/`
- Frontend shows display format (12h/24h) but stores 24h internally

---

## Summary

The centralized date/time formatting system ensures:
- ✅ Consistent formatting across entire app
- ✅ User preferences applied everywhere
- ✅ Real-time updates when preferences change
- ✅ Performance optimized with caching
- ✅ Easy to integrate into any component
- ✅ Type-safe and well-documented

Use `useFormattedDate()` hook in any component that displays dates or times!
