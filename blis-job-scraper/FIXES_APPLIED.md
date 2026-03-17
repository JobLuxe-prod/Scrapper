# Scraper Fixes Applied

## Problem
The Blis job scraper was unable to scrape any data due to invalid CSS selectors.

## Root Cause
The scraper was using Playwright-specific selector syntax (`:has-text()`) which is not supported by Puppeteer's standard `querySelector` API.

## Fixes Applied

### 1. Fixed Cookie Consent Button Selector (Line 52-66)
**Before:**
```javascript
const acceptButton = await this.page.$('button:has-text("Accept all cookies"), button:has-text("Accept")');
```

**After:**
```javascript
const clicked = await this.page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button'));
  const acceptButton = buttons.find(btn => {
    const text = btn.textContent.toLowerCase();
    return text.includes('accept') && (text.includes('all') || text.includes('cookie'));
  });
  
  if (acceptButton) {
    acceptButton.click();
    return true;
  }
  return false;
});
```

### 2. Fixed Apply Button Selector (Line 180-210)
**Before:**
```javascript
const applyButton = document.querySelector('a[href*="apply"], button:has-text("Apply")');
```

**After:**
```javascript
// Try multiple selectors for apply button/link
const selectors = [
  'a[href*="apply"]',
  'button[class*="apply"]',
  'a[class*="apply"]',
  'a.apply-button',
  'button.apply-button'
];

for (const selector of selectors) {
  const element = document.querySelector(selector);
  if (element) {
    const href = element.getAttribute('href');
    return href || window.location.href + '/apply';
  }
}

// Fallback: look for any button/link containing "apply" text
const allLinks = Array.from(document.querySelectorAll('a, button'));
const applyElement = allLinks.find(el => 
  el.textContent.toLowerCase().includes('apply')
);
```

### 3. Enhanced Job Details Extraction (Line 160-200)
Added proper extraction of department, location, and work type from job detail pages:

```javascript
const jobDetails = await this.page.evaluate(() => {
  // Extract metadata from the top of the page
  const metaText = document.body.innerText;
  const lines = metaText.split('\n').map(l => l.trim()).filter(l => l);
  
  let department = '';
  let location = '';
  let workType = '';
  
  // Look for the metadata line (usually first line with department · location · work type)
  const metaLine = lines.find(line => line.includes('·'));
  if (metaLine) {
    const parts = metaLine.split('·').map(p => p.trim());
    if (parts.length >= 2) {
      department = parts[0];
      location = parts[1];
      if (parts.length >= 3) {
        workType = parts[2];
      }
    }
  }
  
  // ... rest of extraction logic
});
```

## Results

### Before Fixes
- ❌ 0 jobs scraped
- ❌ Error: "Failed to execute 'querySelector' on 'Document': 'button:has-text("Apply")' is not a valid selector"

### After Fixes
- ✅ 11 jobs successfully scraped
- ✅ All fields properly extracted (title, department, location, workType, description, url, applyUrl)
- ✅ Data exported to both JSON and CSV formats
- ✅ Execution time: ~55 seconds

## Sample Output
```json
{
  "id": "7354615-associate-senior-technical-account-manager-12-month-mat-cover",
  "title": "Associate Senior Technical Account Manager (12 month mat cover)",
  "department": "CLIENT SERVICES",
  "location": "LONDON",
  "workType": "HYBRID",
  "description": "CLIENT SERVICES · LONDON · HYBRID\nAssociate Senior Technical Account Manager...",
  "url": "https://careers.blis.com/jobs/7354615-associate-senior-technical-account-manager-12-month-mat-cover",
  "applyUrl": "https://careers.blis.com/jobs/7354615-associate-senior-technical-account-manager-12-month-mat-cover/apply",
  "scrapedAt": "2026-03-12T14:34:21.581Z"
}
```

## Key Takeaways
1. Always use standard CSS selectors compatible with the browser automation library you're using
2. Puppeteer uses standard DOM APIs, not Playwright's extended selector syntax
3. Implement fallback strategies for element selection to handle different page structures
4. Extract structured data by parsing text content when DOM structure is inconsistent