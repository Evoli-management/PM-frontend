# eNPS Privacy Controls Implementation

## Overview
This implementation provides privacy-focused Employee Net Promoter Score (eNPS) functionality that ensures complete anonymity while still providing valuable organizational insights.

## Key Privacy Features

### 1. **Anonymous by Design**
- eNPS scores are **always anonymous**
- System only records the answer, **never the user identity**
- No way to trace responses back to individual employees

### 2. **Admin Reporting Restrictions**
- Admin reports show **only cumulative scores** for teams and organization
- **No individual scores** are visible to administrators
- Minimum response thresholds (5+ responses) required for team reports

### 3. **Privacy Controls Configuration**
Located in **Profile & Settings > Preferences > Privacy Controls**:

#### Data Collection Settings:
- ✅ **Allow Anonymous Scoring** - Enable employees to submit eNPS scores anonymously
- ⚠️ **Show Individual Scores to Admins** - NOT RECOMMENDED (compromises anonymity)
- 📊 **Enable Team-Level Reports** - Show aggregated scores by team (min 5 responses)
- 🏢 **Enable Organization Reports** - Show aggregated scores for entire organization

#### Data Retention:
- **3 months (90 days)** - Short term retention
- **6 months (180 days)** - Medium term retention  
- **1 year (365 days)** - Standard retention (default)
- **2 years (730 days)** - Extended retention
- **Indefinite** - Manual deletion only

### 4. **Privacy Compliance Status**
Real-time visual indicators showing:
- ✅ **Anonymous Collection** - Enabled/Disabled
- ✅ **Individual Privacy** - Protected/Compromised
- 📊 **Team Insights** - Available/Disabled
- 🗓️ **Data Retention** - Current setting

## Technical Implementation

### Files Modified/Created:
1. **`src/pages/SetProfile.jsx`** - Added Privacy Controls section
2. **`src/components/shared/EnpsWidget.jsx`** - New privacy-focused eNPS widget
3. **`src/pages/Dashboard.jsx`** - Integrated eNPS widget

### Data Structure:
```javascript
// Anonymous submission (NO user identification)
{
  score: 8,                    // 0-10 scale
  feedback: "Great workplace", // Optional anonymous feedback
  timestamp: "2025-08-31...",  // When submitted
  anonymous: true,             // Always true
  sessionId: "abc123"          // Random ID for deduplication only
}
```

### Privacy Safeguards:
- **No user IDs** stored with responses
- **No IP tracking** for eNPS submissions
- **Random session IDs** only for preventing duplicate submissions
- **Automatic data deletion** based on retention settings
- **Aggregation minimums** prevent individual identification

## Administrator Guidelines

### ✅ Do:
- Review team and organization-level trends
- Use aggregated data for improvement initiatives  
- Ensure minimum response thresholds (5+ responses)
- Focus on overall patterns and trends

### ❌ Don't:
- Attempt to identify individual respondents
- Use data for performance reviews
- Share raw response data outside authorized personnel
- Try to correlate responses with employee data

## Usage Instructions

### For Employees:
1. Navigate to Dashboard
2. Complete the anonymous eNPS survey when it appears
3. Optionally provide anonymous feedback
4. Submit knowing your response is completely private

### For Administrators:
1. Go to **Profile & Settings > Preferences > Privacy Controls**
2. Configure privacy settings according to organizational needs
3. Review aggregated reports (when available)
4. Use insights for organizational improvement

## Privacy Compliance
This implementation follows privacy-by-design principles:
- **Data Minimization** - Only essential data collected
- **Purpose Limitation** - Data used only for eNPS analysis
- **Anonymization** - No personal identifiers stored
- **Retention Limits** - Automatic deletion after specified period
- **Transparency** - Clear privacy notices for users

## Future Enhancements
- Integration with external survey platforms
- Advanced anonymization techniques
- Real-time privacy compliance monitoring
- Automated privacy impact assessments
