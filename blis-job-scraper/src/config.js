export const config = {
  // Career page URLs to scrape
  careerUrls: [
    {
      name: 'Blis',
      url: 'https://careers.blis.com/jobs/',
      type: 'blis'
    },
    {
      name: 'SoundHound',
      url: 'https://jobs.gem.com/soundhound',
      type: 'gem'
    }
  ],
  
  // Base URL for Blis careers (kept for backward compatibility)
  baseUrl: 'https://careers.blis.com/jobs/',
  
  // Scraping settings
  scraping: {
    headless: true,
    timeout: 30000,
    waitForSelector: 'a[href*="/jobs/"]',
    scrollDelay: 1000,
    maxRetries: 3
  },
  
  // Output settings
  output: {
    directory: './output',
    jsonFile: 'blis-jobs.json',
    csvFile: 'blis-jobs.csv',
    excelFile: 'blis-india-jobs.xlsx',
    includeTimestamp: true,
    separateSheetsByCompany: true
  },
  
  // Browser settings
  browser: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ],
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  },
  
  // Selectors for job data
  selectors: {
    jobList: 'a[href*="/jobs/"]',
    jobTitle: 'h1',
    department: 'text',
    location: 'text',
    workType: 'text',
    description: 'div, p',
    applyButton: 'button, a[href*="apply"]'
  }
};

export default config;

// Made with Bob
