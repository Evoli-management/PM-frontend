# Time Format Integration Documentation

## Overview
This document describes the implementation of dynamic time format preferences (12h/24h) across calendar views in the PM-frontend application.

## 🎯 **Implementation Summary**

### **Backend Changes**
1. **Database Schema** (`userPreferences.ts`)
   - Added `timeFormat` enum field: `'12h' | '24h'`
   - Default value: `'12h'` (12-hour format with AM/PM)
   - Database migration created for existing users

2. **API DTOs**
   - Updated `UpdateUserPreferencesDto` to include `timeFormat` field
   - Updated `UserPreferencesResponseDto` to return `timeFormat`
   - Added validation with `TimeFormat` enum

### **Frontend Changes**
1. **New Hook** (`useCalendarPreferences.js`)
   - Comprehensive calendar preferences management
   - Combines working hours + time format + timezone
   - Provides `formatTime()` function for consistent formatting
   - Real-time updates via custom events

2. **Calendar Components Updated**
   - **DayView**: Time slots display in user's preferred format
   - **WeekView**: Hour labels show formatted times
   - **MonthView**: Hour headers respect time format setting
   - **All Views**: Working hours indicators use formatted display

3. **Preferences Integration**
   - Time format changes emit `timeFormatChanged` events
   - Calendar components listen for real-time updates
   - Existing time format dropdown now functional

## 🔧 **Technical Implementation**

### **Time Formatting Logic**
```javascript
// Example: formatTimeForDisplay function
const formatTimeForDisplay = (timeStr, use24Hour = false) => {
    if (use24Hour) return timeStr; // "14:30"
    
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    // Result: "2:30 PM"
};
```

### **Event System**
```javascript
// Preferences component emits:
window.dispatchEvent(new CustomEvent('timeFormatChanged', {
    detail: { timeFormat: '24h' }
}));

// Calendar components listen:
useEffect(() => {
    const handleTimeFormatChanged = (event) => {
        updateTimeFormat(event.detail.timeFormat);
    };
    window.addEventListener('timeFormatChanged', handleTimeFormatChanged);
    return () => window.removeEventListener('timeFormatChanged', handleTimeFormatChanged);
}, []);
```

## 📋 **User Experience**

### **How It Works**
1. User opens **Profile → Preferences → Language & Region**
2. Changes **Time Format** from "12 Hour" to "24 Hour" (or vice versa)
3. Clicks **"Save Preferences"**
4. **All calendar views instantly update** to show times in the new format
5. Setting persists across browser sessions via database storage

### **Examples**
| Time | 12-Hour Format | 24-Hour Format |
|------|----------------|----------------|
| 08:00 | 8:00 AM | 08:00 |
| 12:00 | 12:00 PM | 12:00 |
| 13:30 | 1:30 PM | 13:30 |
| 17:00 | 5:00 PM | 17:00 |
| 23:59 | 11:59 PM | 23:59 |

## 🔄 **Integration Points**

### **Calendar Views**
- **DayView**: Time slot labels in left column
- **WeekView**: Hour headers in time grid
- **MonthView**: Hour column headers
- **All Views**: Working hours display in header

### **Preferences System**
- **Database**: Stored in `user_preferences.time_format`
- **API**: Included in preferences GET/PUT endpoints
- **Frontend**: Managed by `useCalendarPreferences` hook
- **Events**: Real-time updates via custom events

## 🧪 **Testing**

### **Manual Testing**
1. Open calendar in any view (Day/Week/Month)
2. Note current time format in time labels
3. Go to Preferences → Language & Region
4. Change Time Format setting
5. Save preferences
6. Return to calendar - times should update immediately
7. Refresh page - setting should persist

### **Test Component**
A `TimeFormatTest` component is available for debugging:
- Shows current format setting
- Displays formatted vs raw times
- Allows toggle between formats
- Useful for verifying formatting logic

## 🚀 **Deployment Notes**

### **Database Migration Required**
```sql
-- Run this migration on production database
CREATE TYPE "time_format" AS ENUM ('12h', '24h');
ALTER TABLE user_preferences 
ADD COLUMN time_format "time_format" DEFAULT '12h' NOT NULL;
```

### **Backwards Compatibility**
- Existing users default to '12h' format (current behavior)
- No breaking changes to existing API endpoints
- Frontend gracefully handles missing timeFormat field

## 🎉 **Complete Feature Set**

The time format integration completes the comprehensive calendar personalization system:

✅ **Working Hours** - Dynamic time ranges based on user work schedule
✅ **Time Format** - 12h/24h display preference across all calendar views  
✅ **Real-time Updates** - Instant synchronization across calendar components
✅ **Database Persistence** - Settings saved and restored across sessions
✅ **User-friendly Interface** - Easy to discover and change in preferences

Users now have full control over both **when** they see calendar time slots (working hours) and **how** those times are displayed (12h/24h format)!