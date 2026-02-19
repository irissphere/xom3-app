# XOM3 Testing Checklist

## ✅ Pre-Testing Setup

- [ ] Dev server is running (`npm run dev` in `xom3-app`)
- [ ] `.env.local` has correct Airtable base IDs:
  - `AIRTABLE_USHA_BASE_ID=appCkU8L3sdmqaAmI` (Healthcare CRM)
  - `AIRTABLE_BASE_ID=appgAjwWw2Jr2TC0K` (Xom3 Commander Cockpit)
  - `AIRTABLE_API_KEY=pat...` (valid token)

---

## 1. Landing Page (`/app`)

**URL:** http://localhost:3000/app

- [ ] Page loads without errors
- [ ] Three main cards display:
  - [ ] Healthcare CRM card
  - [ ] Command Center card
  - [ ] XOM3 Master Cockpit card
- [ ] All cards have hover effects (border color changes)
- [ ] Quick Links section at bottom displays
- [ ] Click "Healthcare CRM" → navigates to `/app/healthcare`
- [ ] Click "Command Center" → navigates to `/command`
- [ ] Click "XOM3 Master Cockpit" → navigates to `/xom3`
- [ ] All quick links work

---

## 2. Healthcare CRM Dashboard (`/app/healthcare`)

**URL:** http://localhost:3000/app/healthcare

### 2.1 Analytics Dashboard
- [ ] Analytics cards display (Prospect, Intake, Active, Compliance, Closed)
- [ ] Cards show numbers (not all zeros if data exists)
- [ ] Cards have dark theme styling (no white boxes)
- [ ] Cards are responsive

### 2.2 Follow-ups Panel
- [ ] Panel displays
- [ ] Shows tasks, calls, emails
- [ ] Overdue items highlighted in red
- [ ] Upcoming items highlighted in yellow
- [ ] Filters work (Status, Type dropdowns)
- [ ] Auto-refresh works (updates every 30 seconds)
- [ ] Client links in follow-ups are clickable

### 2.3 Pipeline Board
- [ ] Five columns display: Prospect, Intake, Active, Compliance, Closed
- [ ] Client cards appear in correct columns based on status
- [ ] All clients from Healthcare base are visible (not just one)
- [ ] Client cards show:
  - [ ] Client name
  - [ ] Task count badge
  - [ ] Compliance count badge
  - [ ] Billing count badge
- [ ] Click client card → opens client detail page
- [ ] Drag-and-drop works (can move clients between stages)
- [ ] Cards have dark theme styling

### 2.4 Other Panels
- [ ] Export Panel displays
- [ ] Import Panel displays
- [ ] Transformation Panel displays
- [ ] Pipeline Dashboard displays
- [ ] AMP Error Dashboard displays
- [ ] Compliance Dashboard displays

---

## 3. Client Detail Pages (`/app/healthcare/clients/[id]`)

**URL:** http://localhost:3000/app/healthcare/clients/[clientId]

- [ ] Page loads when clicking client card
- [ ] Client information displays:
  - [ ] Name
  - [ ] Email
  - [ ] Phone
  - [ ] Status
- [ ] Tasks section displays
- [ ] Interactions section displays
- [ ] Billing section displays
- [ ] Back button works
- [ ] All sections have dark theme styling

---

## 4. API Endpoints

### 4.1 Pipeline API
**URL:** http://localhost:3000/api/usha/pipeline

- [ ] Returns JSON response
- [ ] Contains `pipelines` object with 5 stages
- [ ] Contains `total` count
- [ ] All clients from Healthcare base are included
- [ ] Status mapping works correctly

### 4.2 Analytics API
**URL:** http://localhost:3000/api/usha/analytics

- [ ] Returns JSON response
- [ ] Contains `pipelineCounts` object
- [ ] Counts match actual data in Airtable
- [ ] No errors in console

### 4.3 Tasks API
**URL:** http://localhost:3000/api/usha/tasks

- [ ] Returns JSON response
- [ ] Contains tasks and interactions
- [ ] Data is properly formatted

### 4.4 Follow-ups Activity API
**URL:** http://localhost:3000/api/usha/followups/activity

- [ ] Returns JSON response
- [ ] Contains activity feed
- [ ] Data includes dates, types, statuses

### 4.5 Client Detail API
**URL:** http://localhost:3000/api/usha/clients/[id]

- [ ] Returns JSON response
- [ ] Contains client information
- [ ] Contains tasks array
- [ ] Contains interactions array
- [ ] Contains billing array

---

## 5. Navigation & Other Pages

### 5.1 Command Center
**URL:** http://localhost:3000/command

- [ ] Page loads
- [ ] LinkedIn scraper UI displays
- [ ] Workflow status displays
- [ ] Diagnostics drawer works

### 5.2 XOM3 Master Cockpit
**URL:** http://localhost:3000/xom3

- [ ] Page loads
- [ ] Master dashboard displays
- [ ] All panels render
- [ ] No React hooks errors

### 5.3 Broadcast Pages
- [ ] `/broadcast/operations` loads
- [ ] `/broadcast/executive` loads
- [ ] `/broadcast/system` loads
- [ ] All have dark theme styling

---

## 6. Styling & UI

- [ ] No white boxes or unstyled elements
- [ ] Dark theme consistent across all pages
- [ ] All modals styled correctly
- [ ] Hover effects work on interactive elements
- [ ] Responsive design works on different screen sizes
- [ ] No console errors
- [ ] No React warnings

---

## 7. Error Handling

- [ ] Missing Airtable config shows graceful message (not crash)
- [ ] API errors display user-friendly messages
- [ ] 404 pages work correctly
- [ ] Network errors handled gracefully

---

## Quick Test Commands

```bash
# Test API endpoints
curl http://localhost:3000/api/usha/pipeline
curl http://localhost:3000/api/usha/analytics
curl http://localhost:3000/api/usha/tasks

# Check server is running
netstat -ano | findstr :3000
```

---

## Issues Found

Document any issues here:

1. 
2. 
3. 
