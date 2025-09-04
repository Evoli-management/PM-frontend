# Admin Organization Settings Implementation

## Overview
A comprehensive **Admin Settings Module** separate from the Profile & Settings module, designed specifically for organization-wide administrative settings and system configuration.

## Key Features

### 🏢 **Organization Information**
- **Organization Name** - Company/institution name
- **Organization Code** - Unique identifier (e.g., ABC001)
- **Industry Selection** - Technology, Healthcare, Finance, Education, Manufacturing, Retail, Other
- **Country & Currency** - Location and monetary settings
- **Timezone Configuration** - Global organization timezone

### ⏰ **Working Hours & Calendar**
- **Work Hours Definition** - Start and end times
- **Working Days Configuration** - Which days are work days
- **Calendar Integration** - Organization calendar settings

### 🔒 **Security Settings**
- **Single Sign-On (SSO)** - Enable/disable external identity providers
- **Password Enforcement** - Require secure passwords meeting standards
- **Login Attempt Limits** - Lock accounts after failed attempts
- **Two-Factor Authentication** - Force 2FA for administrators
- **Public Registration** - Allow/restrict user self-registration
- **Session Management** - Configure session timeouts
- **Max Login Attempts** - Define security lockout thresholds

### 📋 **Organizational Policies**
- **Password Policy Configuration**:
  - Minimum length requirements
  - Character requirements (uppercase, lowercase, numbers, special chars)
  - Password expiry periods
- **Data Retention Policies**:
  - User activity logs retention
  - Audit logs retention (compliance)
  - Temporary files cleanup
  - Deleted items recovery period

### 🔌 **System Integrations**
- **Email Configuration**:
  - Email provider selection (SMTP, SendGrid, Mailgun, AWS SES)
  - SMTP settings and authentication
  - Port configuration
- **API Access Controls**:
  - Enable/disable API access
  - Rate limiting configuration
  - Webhook endpoints management

### 📊 **Reporting & Notifications**
- **System Notifications**:
  - Maintenance notices
  - Security alerts
  - User registration notifications
- **Automated Reports**:
  - Daily, weekly, monthly reports
  - Administrative dashboards
  - Compliance reporting

## Technical Implementation

### **Files Created/Modified:**
1. **`src/pages/AdminSettings.jsx`** - Main admin settings interface
2. **`src/App.jsx`** - Added routing for `/admin-settings` and `/settings`
3. **`src/components/shared/Navbar.jsx`** - Added Admin Settings to user menu

### **Routing:**
- `/admin-settings` - Direct access to admin settings
- `/settings` - Sidebar shortcut to admin settings

### **Navigation Access:**
- **Sidebar**: Settings icon → Admin Settings
- **User Menu**: ⚙️ Admin Settings option
- **Direct URL**: Navigate to `/admin-settings`

### **Data Structure:**
```javascript
{
  // Organization Information
  organizationName: "Company Name",
  organizationCode: "ABC001",
  industry: "technology",
  timezone: "America/New_York",
  country: "United States",
  currency: "USD",
  
  // Security Settings
  security: {
    enableSingleSignOn: false,
    enforceSecurePasswords: true,
    enableLoginAttemptLimits: true,
    maxLoginAttempts: 5,
    sessionTimeout: 480,
    enable2FAForAdmins: true,
    allowPublicRegistration: false
  },
  
  // Password Policy
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordExpiry: 90
  },
  
  // Data Retention
  dataRetention: {
    userActivityLogs: 365,
    auditLogs: 2555, // 7 years for compliance
    temporaryFiles: 30,
    deletedItems: 30
  },
  
  // Integrations
  integrations: {
    emailProvider: "smtp",
    emailHost: "smtp.gmail.com",
    emailPort: 587,
    enableAPIAccess: false,
    apiRateLimit: 1000
  },
  
  // Notifications
  notifications: {
    systemMaintenanceNotices: true,
    securityAlerts: true,
    userRegistrationNotices: true,
    dailyReports: false,
    weeklyReports: true,
    monthlyReports: true
  }
}
```

## Usage Instructions

### **For System Administrators:**
1. **Access Admin Settings**:
   - Click Settings in sidebar, OR
   - Click user menu → ⚙️ Admin Settings, OR
   - Navigate to `/admin-settings`

2. **Configure Organization**:
   - Set organization details in "Organization" tab
   - Define working hours and calendar settings
   - Configure data retention policies

3. **Set Security Policies**:
   - Configure authentication requirements
   - Set password policies
   - Enable security features

4. **Manage Integrations**:
   - Set up email service
   - Configure API access
   - Manage external connections

5. **Set Reporting Preferences**:
   - Choose notification types
   - Configure automated reports

### **Navigation Structure:**
```
Admin Settings Module
├── Organization
│   ├── Organization Information
│   ├── Working Hours & Calendar
│   └── Data Management
├── Security
│   └── Authentication & Access
├── Policies
│   └── Password Policy
├── Integrations
│   ├── Email Configuration
│   └── API Access
└── Reports
    └── System Notifications
```

## Key Differences from Profile Settings

| **Profile Settings** | **Admin Settings** |
|---------------------|-------------------|
| 👤 Individual user preferences | 🏢 Organization-wide policies |
| Personal dashboard customization | System configuration |
| User privacy controls | Administrative controls |
| Individual notification settings | System-wide notifications |
| Personal 2FA setup | Organization security policies |

## Security & Compliance

### **Data Protection:**
- ✅ Secure storage of sensitive configuration
- ✅ Role-based access (admin only)
- ✅ Audit logging for policy changes
- ✅ Compliance-ready data retention settings

### **Access Control:**
- ✅ Admin-only access to organization settings
- ✅ Clear separation from user profile settings
- ✅ Secure configuration management

## Future Enhancements
- Role-based permissions for different admin levels
- Configuration backup and restore
- Advanced compliance reporting
- Integration with external identity providers
- Automated policy enforcement
- Configuration templates for different industries
