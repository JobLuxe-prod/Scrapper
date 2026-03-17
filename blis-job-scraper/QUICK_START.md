# Quick Start Guide

## Get Started in 3 Steps

### 1. Install Dependencies
```bash
cd blis-job-scraper
npm install
```

### 2. Run the Scraper
```bash
npm start
```

### 3. Check Results
The scraper will create two files in the `output/` directory:
- `blis-jobs-[timestamp].json` - JSON format
- `blis-jobs-[timestamp].csv` - CSV format

## What You'll See

```
🛠️ Advanced
Blis Job Scraper
================
ℹ Starting job scraping process...
ℹ Target: https://careers.blis.com/jobs/
ℹ Launching browser...
✓ Browser launched successfully
ℹ Navigating to https://careers.blis.com/jobs/...
✓ Navigated to jobs page

Extracting Job Listings
========================
ℹ Found 11 unique job listings

Scraping 11 Job Details
========================
ℹ [1/11] Processing job...
ℹ Scraping details for: Senior Data Engineer
✓ ✓ Scraped: Senior Data Engineer
...

Saving Results
==============
✅ Saved 11 jobs to /path/to/output/blis-jobs-2026-03-10T15-00-00-000Z.json
✅ Saved 11 jobs to /path/to/output/blis-jobs-2026-03-10T15-00-00-000Z.csv

Summary
=======
✓ Total jobs scraped: 11
✓ Time taken: 45.23s
ℹ JSON output: /path/to/output/blis-jobs-2026-03-10T15-00-00-000Z.json
ℹ CSV output: /path/to/output/blis-jobs-2026-03-10T15-00-00-000Z.csv

Sample Jobs
===========

1. Senior Data Engineer
   Department: Engineering
   Location: Edinburgh, London
   Work Type: Hybrid
   URL: https://careers.blis.com/jobs/senior-data-engineer

2. Javascript Support Engineer
   Department: Engineering
   Location: Mumbai
   Work Type: 
   URL: https://careers.blis.com/jobs/javascript-support-engineer

3. Financial Planning and Analysis Specialist
   Department: Finance
   Location: Mumbai
   Work Type: Hybrid
   URL: https://careers.blis.com/jobs/financial-planning-and-analysis-specialist

... and 8 more jobs

Done!
=====
✓ Scraping completed successfully! 🎉
```

## Troubleshooting

### Issue: Browser won't launch
**Solution**: Install Chromium dependencies
```bash
# macOS
brew install chromium

# Ubuntu/Debian
sudo apt-get install chromium-browser
```

### Issue: Permission denied
**Solution**: Make the script executable
```bash
chmod +x src/index.js
```

### Issue: Module not found
**Solution**: Reinstall dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- Check the `output/` folder for your scraped data
- Import the CSV into Excel or Google Sheets
- Use the JSON data in your applications
- Customize the scraper in `src/config.js`

## Need Help?

See the full [README.md](README.md) for detailed documentation.