# India Job Scraper (Multi-Company)

A Node.js web scraper built with Puppeteer to extract job listings from multiple company career websites, focusing on India-based positions.

## Supported Companies

- **Blis** - Mumbai jobs from https://careers.blis.com/jobs/
- **Uber** - Bangalore jobs from https://www.uber.com/in/en/careers/
- **SoundHound** - India jobs from https://jobs.gem.com/soundhound

## Features

- 🚀 Automated job scraping using Puppeteer
- 📊 Exports data in JSON, CSV, and Excel (.xlsx) formats with **separate sheets per company**
- 🇮🇳 Filters jobs to show only India-based positions
- 🎯 Extracts comprehensive job details including:
  - Job title
  - Department
  - Location
  - Work type (Hybrid/Remote/Office)
  - Experience level (automatically detected from title/description)
  - Full job description
  - Application URL
- 🔄 Handles cookie consent automatically
- 📝 Detailed logging with color-coded output
- 💾 Timestamped output files
- 🛡️ Error handling and retry logic

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Clone or download this repository

2. Navigate to the project directory:
```bash
cd blis-job-scraper
```

3. Install dependencies:
```bash
npm install
```

## Usage

### Basic Usage

Run the scraper to fetch jobs from all supported companies:

```bash
npm start
```

Or directly:

```bash
node src/index.js
```

The scraper will automatically:
1. Scrape jobs from Blis (Mumbai)
2. Scrape jobs from Uber (Bangalore)
3. Combine all results into single output files
4. Filter to show only India-based positions

### Output

The scraper will create three files in the `output/` directory:

1. **JSON file**: `blis-jobs-[timestamp].json`
   - Contains structured job data with metadata
   - Includes scraping timestamp and total job count

2. **CSV file**: `blis-jobs-[timestamp].csv`
   - Spreadsheet-compatible format
   - Easy to import into Excel, Google Sheets, etc.

3. **Excel file**: `blis-india-jobs-[timestamp].xlsx`
   - Native Excel format with formatted columns
   - Contains only India-based job listings
   - Ready to open in Microsoft Excel or Google Sheets

### Example Output Structure

**JSON:**
```json
{
  "scrapedAt": "2026-03-10T15:00:00.000Z",
  "totalJobs": 11,
  "jobs": [
    {
      "id": "senior-data-engineer",
      "title": "Senior Data Engineer",
      "department": "Engineering",
      "location": "Mumbai",
      "workType": "Hybrid",
      "experienceLevel": "Senior",
      "description": "Come work on fantastically high-scale systems...",
      "url": "https://careers.blis.com/jobs/senior-data-engineer",
      "applyUrl": "https://careers.blis.com/jobs/senior-data-engineer/apply",
      "scrapedAt": "2026-03-10T15:00:00.000Z"
    }
  ]
}
```

**CSV:**
```csv
ID,Title,Department,Location,Work Type,Experience Level,Description,URL,Apply URL,Scraped At
"senior-data-engineer","Senior Data Engineer","Engineering","Mumbai","Hybrid","Senior","Come work on...","https://careers.blis.com/jobs/senior-data-engineer","https://careers.blis.com/jobs/senior-data-engineer/apply","2026-03-10T15:00:00.000Z"
```

**Excel:**
The Excel file includes all the same fields in a formatted spreadsheet with proper column widths, making it easy to filter and analyze the data.

## Configuration

You can modify scraper settings in `src/config.js`:

```javascript
export const config = {
  baseUrl: 'https://careers.blis.com/jobs/',
  
  scraping: {
    headless: true,        // Run browser in headless mode
    timeout: 30000,        // Page load timeout (ms)
    scrollDelay: 1000,     // Delay between scrolls (ms)
    maxRetries: 3          // Max retry attempts
  },
  
  output: {
    directory: './output',
    jsonFile: 'blis-jobs.json',
    csvFile: 'blis-jobs.csv',
    includeTimestamp: true
  }
};
```

## Project Structure

```
india-job-scraper/
├── src/
│   ├── models/
│   │   └── Job.js              # Job data model
│   ├── utils/
│   │   ├── fileUtils.js        # File operations (JSON/CSV/Excel)
│   │   └── logger.js           # Colored logging utility
│   ├── config.js               # Configuration settings
│   ├── scraper.js              # Blis scraper class
│   ├── uberScraper.js          # Uber scraper class
│   └── index.js                # Entry point (orchestrates all scrapers)
├── output/                     # Generated output files
├── package.json
├── .gitignore
└── README.md
```

## How It Works

1. **Initialization**: Launches Puppeteer browser instances for each company
2. **Multi-Company Scraping**:
   - **Blis**: Scrapes Mumbai-based jobs
   - **Uber**: Scrapes Bangalore-based jobs
3. **Cookie Handling**: Automatically accepts cookie consent
4. **Job Discovery**: Scrolls and extracts all job listing links
5. **Detail Scraping**: Visits each job page to extract full details
6. **Experience Detection**: Automatically detects experience level from titles/descriptions
7. **Data Consolidation**: Combines jobs from all companies
8. **Export**: Saves results to JSON, CSV, and Excel files
9. **Cleanup**: Closes browsers and displays summary

## Error Handling

The scraper includes robust error handling:

- Automatic retry on failed requests
- Graceful handling of missing elements
- Detailed error logging
- Process interruption handling (Ctrl+C)

## Troubleshooting

### Browser Launch Issues

If you encounter browser launch errors:

```bash
# Install Chromium dependencies (Linux)
sudo apt-get install -y chromium-browser

# Or use system Chrome
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

### Memory Issues

For large scraping jobs, increase Node.js memory:

```bash
node --max-old-space-size=4096 src/index.js
```

### Timeout Errors

Increase timeout in `src/config.js`:

```javascript
scraping: {
  timeout: 60000  // 60 seconds
}
```

## Development

### Adding New Features

1. **Custom Selectors**: Modify `config.selectors` in `src/config.js`
2. **Additional Fields**: Extend the `Job` model in `src/models/Job.js`
3. **New Export Formats**: Add methods in `src/utils/fileUtils.js`

### Running in Debug Mode

Set `headless: false` in config to see the browser in action:

```javascript
scraping: {
  headless: false
}
```

## Dependencies

- **puppeteer**: ^22.0.0 - Headless browser automation
- **dotenv**: ^16.4.5 - Environment variable management
- **xlsx**: ^0.18.5 - Excel file generation

## Adding New Companies

To add a new company scraper:

1. Create a new scraper file in `src/` (e.g., `companyScraper.js`)
2. Implement the scraper class with methods:
   - `initialize()` - Launch browser
   - `navigateToJobsPage()` - Navigate to careers page
   - `extractJobListings()` - Extract job links
   - `scrapeJobDetails()` - Get detailed job info
   - `scrape()` - Main orchestration method
3. Import and use in `src/index.js`
4. Filter for India locations in the scraper

See [`src/uberScraper.js`](src/uberScraper.js) as a reference implementation.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Disclaimer

This scraper is for educational purposes. Always respect the website's robots.txt and terms of service. Use responsibly and consider rate limiting to avoid overwhelming the server.

## Support

For issues or questions, please open an issue on the repository.

---

**Happy Scraping! 🚀**