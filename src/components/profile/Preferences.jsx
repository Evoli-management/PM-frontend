import React, { useState, useEffect } from 'react';
import { Section, Field, Toggle, LoadingButton } from './UIComponents';
import TimePicker from '../ui/TimePicker';
import userPreferencesService from '../../services/userPreferencesService';
import userProfileService from '../../services/userProfileService';
import { timeToMinutes } from '../../utils/timeUtils';
import { useCalendarPreferences } from '../../hooks/useCalendarPreferences';
import { getBrowserTimeZone } from '../../utils/time';

// Searchable IANA timezone selector (in-component to avoid adding a new file)
const IanaTimezoneSelect = ({ value, onChange }) => {
    const [query, setQuery] = React.useState('');
    const [zones, setZones] = React.useState([]);
    const [open, setOpen] = React.useState(false);
    const [highlighted, setHighlighted] = React.useState(-1);
    const inputRef = React.useRef(null);
    const listRef = React.useRef(null);
    const containerRef = React.useRef(null);

    useEffect(() => {
        let mounted = true;
        try {
            if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
                try {
                    const vals = Intl.supportedValuesOf('timeZone');
                    if (mounted) setZones(Array.isArray(vals) ? vals : []);
                    return;
                } catch (e) {
                    // fall through to fallback list
                }
            }
        } catch (e) {}
        // Fallback shortlist if browser doesn't support supportedValuesOf
        const fallback = [
            'UTC','Europe/Ljubljana','Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid','Europe/Rome','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Toronto','Asia/Tokyo','Asia/Shanghai','Asia/Kolkata','Australia/Sydney'
        ];
        if (mounted) setZones(fallback);
        return () => { mounted = false; };
    }, []);

    const filtered = React.useMemo(() => {
        const q = String(query || '').toLowerCase();
        if (!q) return zones;
        return zones.filter((z) => z.toLowerCase().includes(q));
    }, [zones, query]);

    // Reset highlighted index when filtered list changes or opens
    useEffect(() => {
        if (open) {
            const idx = filtered.findIndex((z) => z === value);
            setHighlighted(idx >= 0 ? idx : (filtered.length > 0 ? 0 : -1));
        } else {
            setHighlighted(-1);
        }
    }, [filtered, open, value]);

    // Keep highlighted item scrolled into view
    useEffect(() => {
        if (highlighted >= 0 && listRef.current) {
            const el = listRef.current.children[highlighted];
            if (el && typeof el.scrollIntoView === 'function') {
                el.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlighted]);

    // Close the dropdown when clicking outside
    useEffect(() => {
        if (!open) return;
        const onDocClick = (ev) => {
            const target = ev.target;
            if (!containerRef.current) return;
            if (!containerRef.current.contains(target)) {
                setOpen(false);
                setQuery('');
                setHighlighted(-1);
                if (inputRef.current) inputRef.current.blur();
            }
        };
        document.addEventListener('pointerdown', onDocClick);
        // keep mouse support for environments that don't have pointer events
        document.addEventListener('mousedown', onDocClick);
        return () => {
            document.removeEventListener('pointerdown', onDocClick);
            document.removeEventListener('mousedown', onDocClick);
        };
    }, [open]);

    const handleKeyDown = (e) => {
        if (!open) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted((h) => {
                const next = h + 1;
                return next >= filtered.length ? 0 : next;
            });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted((h) => {
                const prev = h - 1;
                return prev < 0 ? Math.max(0, filtered.length - 1) : prev;
            });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlighted >= 0 && filtered[highlighted]) {
                const sel = filtered[highlighted];
                onChange(sel);
                setOpen(false);
                setQuery('');
                // return focus to input
                if (inputRef.current) inputRef.current.focus();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            setQuery('');
            if (inputRef.current) inputRef.current.blur();
        }
    };

    const detected = (() => {
        try {
            return getBrowserTimeZone();
        } catch (e) {
            return '';
        }
    })();

    return (
        <div className="relative">
            <div className="flex items-center space-x-2">
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search timezone or type to detect"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    className="w-full px-2 py-1.5 text-sm border-b border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-400 focus:outline-none"
                />
                <button
                    type="button"
                    onClick={() => { onChange(detected || getBrowserTimeZone()); setQuery(''); }}
                    className="text-sm text-blue-600"
                    title={detected ? `Auto-detected: ${detected}` : 'Auto-detected timezone'}
                >
                    {detected ? `Auto (Detected: ${detected})` : 'Auto'}
                </button>
            </div>
            {open && filtered && filtered.length > 0 && (
                <ul
                    ref={listRef}
                    role="listbox"
                    aria-label="Timezones"
                    className="absolute z-40 bg-white border border-gray-200 rounded mt-1 max-h-48 overflow-auto w-full shadow-sm"
                >
                    {filtered.slice(0, 200).map((z, idx) => {
                        const isSelected = z === value;
                        const isHighlighted = idx === highlighted;
                        return (
                            <li
                                key={z}
                                role="option"
                                aria-selected={isSelected}
                                tabIndex={-1}
                                onMouseDown={() => { onChange(z); setOpen(false); setQuery(''); }}
                                onMouseEnter={() => setHighlighted(idx)}
                                className={`px-2 py-1 text-sm cursor-pointer ${isSelected ? 'bg-blue-50' : ''} ${isHighlighted ? 'bg-blue-100' : ''}`}
                            >
                                {z}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

// Simple Toggle component for nested preferences
const SimpleToggle = ({ checked, onChange, disabled = false }) => (
    <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            disabled ? "bg-gray-200 cursor-not-allowed" : checked ? "bg-blue-600" : "bg-gray-300"
        }`}
    >
        <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition ${
                checked ? "translate-x-5" : "translate-x-1"
            }`}
        />
    </button>
);

export const Preferences = ({ showToast }) => {
    // Use calendar preferences hook to get current time format
    const { 
        preferences: calendarPrefs, 
        use24Hour, 
        loading: calendarLoading,
        refreshPreferences 
    } = useCalendarPreferences();

    const [preferences, setPreferences] = useState({
        // Work Hours (mapped to backend fields)
        workStartTime: '09:00',
        workEndTime: '17:00',
        
        // Goal Reminders (mapped to backend fields)
        goalRemindersEmail: true,
        goalRemindersDesktop: true,
        goalReminderTiming: '1hour',
        
        // PracticalManager Reminders (mapped to backend fields)
        pmRemindersEmail: true,
        pmRemindersDesktop: true,
        pmReminderTiming: '30min',
        
        // Legacy preferences (keep for backward compatibility)
        emailNotifications: true,
        browserNotifications: true,
        mobileNotifications: true,
        taskReminders: true,
        projectUpdates: true,
        deadlineAlerts: true,
        theme: 'light',
        compactMode: false,
        showCompletedTasks: false,
        animationsEnabled: true,
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: 'MM/dd/yyyy',
        timeFormat: '12h'
    });
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    useEffect(() => {
        loadPreferences();
    }, []);
    
    // Apply theme changes to the document
    useEffect(() => {
        const applyTheme = (theme) => {
            const root = document.documentElement;
            
            if (theme === 'dark') {
                root.classList.add('dark');
            } else if (theme === 'light') {
                root.classList.remove('dark');
            } else if (theme === 'auto') {
                // Auto mode - follow system preference
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (prefersDark) {
                    root.classList.add('dark');
                } else {
                    root.classList.remove('dark');
                }
            }
        };
        
        applyTheme(preferences.theme);
        
        // Listen for system theme changes when in auto mode
        if (preferences.theme === 'auto') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = (e) => {
                if (preferences.theme === 'auto') {
                    if (e.matches) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                }
            };
            
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        }
    }, [preferences.theme]);
    
    const loadPreferences = async () => {
        setLoading(true);
        try {
            // Load from API first
            const apiPreferences = await userPreferencesService.getPreferences();
            
            // Load legacy preferences from localStorage for backward compatibility
            const localPreferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
            
            // Merge API preferences with local ones, prioritizing API
            setPreferences(prev => ({
                ...prev,
                ...localPreferences,
                ...apiPreferences,
                // Map API fields to component fields
                workStartTime: apiPreferences.workStartTime || prev.workStartTime,
                workEndTime: apiPreferences.workEndTime || prev.workEndTime,
            }));
        } catch (error) {
            console.error('Error loading preferences:', error);
            // Fallback to localStorage if API fails
            try {
                const saved = localStorage.getItem('userPreferences');
                if (saved) {
                    setPreferences(prev => ({ ...prev, ...JSON.parse(saved) }));
                }
            } catch (localError) {
                showToast('Failed to load preferences', 'error');
            }
        } finally {
            setLoading(false);
        }
    };
    
    const savePreferences = async () => {
        setSaving(true);
        try {
            // Validate preferences
            const validation = userPreferencesService.validatePreferences(preferences);
            if (!validation.isValid) {
                const firstError = Object.values(validation.errors)[0];
                showToast(firstError, 'error');
                return;
            }

            // Extra client-side validation for working hours ordering
            if (preferences.workStartTime && preferences.workEndTime) {
                const startMin = timeToMinutes(preferences.workStartTime);
                const endMin = timeToMinutes(preferences.workEndTime);
                if (!(startMin < endMin)) {
                    showToast('Work start time must be before end time', 'error');
                    return;
                }
            }

            // Validate time format before sending to API
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (preferences.workStartTime && !timeRegex.test(preferences.workStartTime)) {
                showToast('Work start time must be in HH:MM format', 'error');
                return;
            }
            if (preferences.workEndTime && !timeRegex.test(preferences.workEndTime)) {
                showToast('Work end time must be in HH:MM format', 'error');
                return;
            }

            // Prepare API data - only send backend-supported fields
            const apiData = {};
            
            // Only include time fields if they're properly formatted
            if (preferences.workStartTime && timeRegex.test(preferences.workStartTime)) {
                apiData.workStartTime = preferences.workStartTime;
            }
            if (preferences.workEndTime && timeRegex.test(preferences.workEndTime)) {
                apiData.workEndTime = preferences.workEndTime;
            }
            
            // Add other supported fields
            if (preferences.timeFormat) apiData.timeFormat = preferences.timeFormat;
            if (preferences.dateFormat) {
                // Resolve 'auto' to a locale-driven pattern before sending to API
                if (preferences.dateFormat === 'auto') {
                    const locale = (navigator && navigator.language) || 'en-US';
                    apiData.dateFormat = detectPatternFromLocale(locale);
                } else {
                    apiData.dateFormat = preferences.dateFormat;
                }
            }
            if (preferences.theme) apiData.theme = preferences.theme;
            if (preferences.goalRemindersEmail !== undefined) apiData.goalRemindersEmail = preferences.goalRemindersEmail;
            if (preferences.goalRemindersDesktop !== undefined) apiData.goalRemindersDesktop = preferences.goalRemindersDesktop;
            if (preferences.goalReminderTiming) apiData.goalReminderTiming = preferences.goalReminderTiming;
            if (preferences.pmRemindersEmail !== undefined) apiData.pmRemindersEmail = preferences.pmRemindersEmail;
            if (preferences.pmRemindersDesktop !== undefined) apiData.pmRemindersDesktop = preferences.pmRemindersDesktop;
            if (preferences.pmReminderTiming) apiData.pmReminderTiming = preferences.pmReminderTiming;

            // Save to API (preferences)
            await userPreferencesService.updatePreferences(apiData);
            // Persist timezone to user profile as canonical source for IANA timezone
            if (preferences.timezone) {
                try {
                    await userProfileService.updateProfile({ timeZone: preferences.timezone });
                } catch (e) {
                    // non-fatal: preferences still saved; log briefly
                    console.warn('Failed to persist timezone to profile:', e);
                }
            }
            
            // Also save all preferences to localStorage for legacy support
            localStorage.setItem('userPreferences', JSON.stringify(preferences));
            
            // Refresh calendar preferences to pick up the changes immediately
            if (refreshPreferences) {
                await refreshPreferences();
            }
            
            // Trigger custom events to notify calendar components of changes
            if (apiData.workStartTime || apiData.workEndTime) {
                window.dispatchEvent(new CustomEvent('workingHoursChanged', {
                    detail: {
                        startTime: apiData.workStartTime || preferences.workStartTime,
                        endTime: apiData.workEndTime || preferences.workEndTime
                    }
                }));
            }
            
            if (apiData.timeFormat) {
                window.dispatchEvent(new CustomEvent('timeFormatChanged', {
                    detail: {
                        timeFormat: apiData.timeFormat
                    }
                }));
            }
            
            if (apiData.dateFormat) {
                window.dispatchEvent(new CustomEvent('dateFormatChanged', {
                    detail: {
                        dateFormat: apiData.dateFormat
                    }
                }));
            }
            
            if (apiData.theme) {
                window.dispatchEvent(new CustomEvent('themeChanged', {
                    detail: {
                        theme: apiData.theme
                    }
                }));
            }
            
            showToast('Preferences saved successfully');
        } catch (error) {
            console.error('Error saving preferences:', error);
            const apiMsg = error?.response?.data?.message;
            const msg = Array.isArray(apiMsg) ? apiMsg.join(', ') : (apiMsg || 'Failed to save preferences');
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };
    
    const updatePreference = (key, value) => {
        // If the user changes the timeFormat, convert existing work hours to the new format
        if (key === 'timeFormat') {
            const to24 = value === '24h';
            const to24Time = (t) => {
                if (!t) return t;
                // already 24h HH:MM
                const h24 = /^([01]?\d|2[0-3]):([0-5]\d)$/;
                const ampm = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
                const m24 = t.match(h24);
                if (m24) {
                    // normalize to HH:MM (pad hour)
                    return `${String(m24[1]).padStart(2,'0')}:${m24[2]}`;
                }
                const m = t.match(ampm);
                if (m) {
                    let hh = parseInt(m[1], 10);
                    const mm = m[2];
                    const ap = m[3].toUpperCase();
                    if (ap === 'PM' && hh !== 12) hh += 12;
                    if (ap === 'AM' && hh === 12) hh = 0;
                    return `${String(hh).padStart(2,'0')}:${mm}`;
                }
                // fallback: try to parse naive numeric like '8:00 AM' variations
                try {
                    const parsed = new Date(`1970-01-01T${t}`);
                    if (!isNaN(parsed.getTime())) return `${String(parsed.getHours()).padStart(2,'0')}:${String(parsed.getMinutes()).padStart(2,'0')}`;
                } catch (_) {}
                return t;
            };
            const to12Time = (t) => {
                if (!t) return t;
                const h24 = /^([01]?\d|2[0-3]):([0-5]\d)$/;
                const ampm = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
                const m24 = t.match(h24);
                if (m24) {
                    let hh = parseInt(m24[1], 10);
                    const mm = m24[2];
                    const ap = hh >= 12 ? 'PM' : 'AM';
                    const displayHour = hh % 12 === 0 ? 12 : hh % 12;
                    return `${displayHour}:${mm} ${ap}`;
                }
                const m = t.match(ampm);
                if (m) {
                    // normalize spacing/padding
                    let hh = parseInt(m[1], 10);
                    const mm = m[2];
                    const ap = m[3].toUpperCase();
                    const displayHour = hh % 12 === 0 ? 12 : hh % 12;
                    return `${displayHour}:${mm} ${ap}`;
                }
                try {
                    const parsed = new Date(`1970-01-01T${t}`);
                    if (!isNaN(parsed.getTime())) {
                        const hh = parsed.getHours();
                        const mm = String(parsed.getMinutes()).padStart(2,'0');
                        const ap = hh >= 12 ? 'PM' : 'AM';
                        const displayHour = hh % 12 === 0 ? 12 : hh % 12;
                        return `${displayHour}:${mm} ${ap}`;
                    }
                } catch (_) {}
                return t;
            };

            setPreferences(prev => ({
                ...prev,
                timeFormat: value,
                workStartTime: to24 ? to24Time(prev.workStartTime) : to12Time(prev.workStartTime),
                workEndTime: to24 ? to24Time(prev.workEndTime) : to12Time(prev.workEndTime)
            }));
            return;
        }
        setPreferences(prev => ({ ...prev, [key]: value }));
    };

    // Helpers for date format detection and sample preview
    const detectPatternFromLocale = (locale) => {
        try {
            const sample = new Date(2025, 10, 27); // 27 Nov 2025
            const parts = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
                .formatToParts(sample)
                .filter(p => ['year', 'month', 'day'].includes(p.type))
                .map(p => p.type);
            const seq = parts.join('-');
            if (seq === 'month-day-year' || seq === 'month-day-year') return 'MM/dd/yyyy';
            if (seq === 'day-month-year') return 'dd/MM/yyyy';
            if (seq === 'year-month-day') return 'yyyy-MM-dd';
            // fallback
            return 'MM/dd/yyyy';
        } catch (e) {
            return 'MM/dd/yyyy';
        }
    };

    const sampleForFormat = (fmt) => {
        const sample = new Date(2025, 10, 27);
        if (fmt === 'auto') {
            const locale = (navigator && navigator.language) || 'en-US';
            return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'numeric', day: 'numeric' }).format(sample);
        }
        switch (fmt) {
            case 'MM/dd/yyyy':
                return `${String(sample.getMonth() + 1).padStart(2, '0')}/${String(sample.getDate()).padStart(2, '0')}/${sample.getFullYear()}`;
            case 'dd/MM/yyyy':
                return `${String(sample.getDate()).padStart(2, '0')}/${String(sample.getMonth() + 1).padStart(2, '0')}/${sample.getFullYear()}`;
            case 'yyyy-MM-dd':
                return `${sample.getFullYear()}-${String(sample.getMonth() + 1).padStart(2, '0')}-${String(sample.getDate()).padStart(2, '0')}`;
            case 'MMM dd, yyyy':
                return new Intl.DateTimeFormat((navigator && navigator.language) || 'en-US', { year: 'numeric', month: 'short', day: '2-digit' }).format(sample);
            default:
                return fmt;
        }
    };
    
    const resetToDefaults = async () => {
        setSaving(true);
        try {
            // Reset via API
            const defaultPreferences = await userPreferencesService.resetPreferences();
            
            // Update state with API defaults plus local defaults for other fields
            setPreferences(prev => ({
                // Keep local defaults for non-API fields
                emailNotifications: true,
                browserNotifications: true,
                mobileNotifications: true,
                taskReminders: true,
                projectUpdates: true,
                deadlineAlerts: true,
                theme: 'light',
                compactMode: false,
                showCompletedTasks: false,
                animationsEnabled: true,
                language: 'en',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                dateFormat: 'MM/dd/yyyy',
                timeFormat: '12h',
                // Apply API defaults
                ...defaultPreferences,
            }));
            
            showToast('Preferences reset to defaults');
        } catch (error) {
            console.error('Error resetting preferences:', error);
            showToast('Failed to reset preferences', 'error');
        } finally {
            setSaving(false);
        }
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {/* Language & Region - MOVED TO FIRST */}
            <Section 
                title="Language & Region" 
                description="Set your language, timezone, and format preferences"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Language">
                        <select
                            value={preferences.language}
                            onChange={(e) => updatePreference('language', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border-b border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-400 focus:outline-none"
                        >
                            <option value="en">English</option>
                            <option value="sl">Slovenian</option>
                        </select>
                    </Field>
                    
                    <Field label="Timezone">
                        <IanaTimezoneSelect
                            value={preferences.timezone}
                            onChange={(val) => updatePreference('timezone', val)}
                        />
                    </Field>
                    
                    <Field label="Date Format">
                        <div>
                            <select
                                value={preferences.dateFormat}
                                onChange={(e) => updatePreference('dateFormat', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border-b border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-400 focus:outline-none"
                            >
                                <option value="auto">Auto</option>
                                <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                                <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                                <option value="yyyy-MM-dd">YYYY-MM-DD</option>
                                <option value="MMM dd, yyyy">MMM DD, YYYY</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Example: <span className="font-medium">{sampleForFormat(preferences.dateFormat)}</span></p>
                        </div>
                    </Field>
                    
                    <Field label="Time Format">
                        <select
                            value={preferences.timeFormat}
                            onChange={(e) => updatePreference('timeFormat', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border-b border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-400 focus:outline-none"
                        >
                            <option value="12h">12 Hour</option>
                            <option value="24h">24 Hour</option>
                        </select>
                    </Field>
                </div>
            </Section>

            {/* Work Hours Preferences - MOVED TO SECOND */}
            <Section 
                title="Work Hours Preferences" 
                description="Set your preferred working hours. These hours will be used to customize calendar views to show only your working time."
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Start Time">
                        <TimePicker
                            value={preferences.workStartTime}
                            onChange={(value) => updatePreference('workStartTime', value)}
                            use24Hour={preferences.timeFormat === '24h'}
                            className="w-full"
                            label="Work Start Time"
                        />
                    </Field>
                    <Field label="End Time">
                        <TimePicker
                            value={preferences.workEndTime}
                            onChange={(value) => updatePreference('workEndTime', value)}
                            use24Hour={preferences.timeFormat === '24h'}
                            className="w-full"
                            label="Work End Time"
                        />
                    </Field>
                </div>
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-blue-800">Calendar Integration</p>
                            <p className="text-sm text-blue-700 mt-1">
                                Your working hours will automatically adjust the time range shown in daily and weekly calendar views. 
                                Instead of showing all 24 hours, the calendar will focus on your working period for a cleaner, more relevant view.
                            </p>
                        </div>
                    </div>
                </div>
            </Section>
            
            {/* PracticalManager Reminders - THIRD */}
            <Section 
                title="PracticalManager Reminders" 
                description="Manage system-wide reminder notifications"
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                            <h4 className="font-medium text-gray-800">PracticalManager Notifications</h4>
                            <p className="text-sm text-gray-600 mt-1">System reminders and notifications</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-center">
                                <span className="text-xs text-gray-500 block mb-1">Email</span>
                                <SimpleToggle
                                    checked={preferences.pmRemindersEmail}
                                    onChange={(checked) => updatePreference('pmRemindersEmail', checked)}
                                />
                            </div>
                            <div className="text-center">
                                <span className="text-xs text-gray-500 block mb-1">Desktop</span>
                                <SimpleToggle
                                    checked={preferences.pmRemindersDesktop}
                                    onChange={(checked) => updatePreference('pmRemindersDesktop', checked)}
                                />
                            </div>
                        </div>
                    </div>
                    <Field label="Reminder Timing">
                        <select
                            value={preferences.pmReminderTiming}
                            onChange={(e) => updatePreference('pmReminderTiming', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border-b border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-400 focus:outline-none"
                        >
                            <option value="5min">5 minutes before</option>
                            <option value="15min">15 minutes before</option>
                            <option value="30min">30 minutes before</option>
                            <option value="1hour">1 hour before</option>
                            <option value="2hours">2 hours before</option>
                            <option value="1day">1 day before</option>
                        </select>
                    </Field>
                </div>
            </Section>
            
            {/* Goal Reminders - FOURTH */}
            <Section 
                title="Goal Reminders" 
                description="Configure goal-related reminder notifications"
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                            <h4 className="font-medium text-gray-800">Goal Reminder Notifications</h4>
                            <p className="text-sm text-gray-600 mt-1">Reminders for goals and deadlines</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-center">
                                <span className="text-xs text-gray-500 block mb-1">Email</span>
                                <SimpleToggle
                                    checked={preferences.goalRemindersEmail}
                                    onChange={(checked) => updatePreference('goalRemindersEmail', checked)}
                                />
                            </div>
                            <div className="text-center">
                                <span className="text-xs text-gray-500 block mb-1">Desktop</span>
                                <SimpleToggle
                                    checked={preferences.goalRemindersDesktop}
                                    onChange={(checked) => updatePreference('goalRemindersDesktop', checked)}
                                />
                            </div>
                        </div>
                    </div>
                    <Field label="Reminder Timing">
                        <select
                            value={preferences.goalReminderTiming}
                            onChange={(e) => updatePreference('goalReminderTiming', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border-b border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-400 focus:outline-none"
                        >
                            <option value="5min">5 minutes before</option>
                            <option value="15min">15 minutes before</option>
                            <option value="30min">30 minutes before</option>
                            <option value="1hour">1 hour before</option>
                            <option value="2hours">2 hours before</option>
                            <option value="1day">1 day before</option>
                        </select>
                    </Field>
                </div>
            </Section>

            {/* Theme & Display - FIFTH (was SIXTH) */}
            <Section 
                title="Theme & Display" 
                description="Customize the appearance of your workspace"
            >
                <div className="space-y-4">
                    <Field label="Theme">
                        <select
                            value={preferences.theme}
                            onChange={(e) => updatePreference('theme', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border-b border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-400 focus:outline-none"
                        >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="auto">Auto (System)</option>
                        </select>
                    </Field>
                </div>
            </Section>
            
            {/* Actions */}
            <div className="flex justify-between pt-6">
                <button
                    onClick={resetToDefaults}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
                >
                    Reset to Defaults
                </button>
                
                <LoadingButton
                    onClick={savePreferences}
                    loading={saving}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                    Save Preferences
                </LoadingButton>
            </div>
        </div>
    );
};