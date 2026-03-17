import puppeteer from 'puppeteer';
import { config } from './config.js';
import { Job } from './models/Job.js';
import { logger } from './utils/logger.js';

/**
 * Helper function to wait/delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export class BlisScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.jobs = [];
  }

  /**
   * Initialize browser and page
   */
  async initialize() {
    logger.info('Launching browser...');
    this.browser = await puppeteer.launch({
      headless: config.scraping.headless,
      args: config.browser.args,
      defaultViewport: config.browser.defaultViewport
    });

    this.page = await this.browser.newPage();
    
    // Set user agent to avoid detection
    await this.page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    logger.success('Browser launched successfully');
  }

  /**
   * Navigate to jobs page and accept cookies
   */
  async navigateToJobsPage() {
    logger.info(`Navigating to ${config.baseUrl}...`);
    
    await this.page.goto(config.baseUrl, {
      waitUntil: 'networkidle2',
      timeout: config.scraping.timeout
    });

    // Wait for page to load
    await delay(2000);

    // Accept cookies if present
    try {
      // Try to find and click cookie accept button
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
      
      if (clicked) {
        logger.info('Accepted cookies');
        await delay(1000);
      }
    } catch (error) {
      logger.debug('No cookie banner found or already accepted');
    }

    logger.success('Navigated to jobs page');
  }

  /**
   * Extract job listings from the main page
   */
  async extractJobListings() {
    logger.section('Extracting Job Listings');

    // Scroll to load all jobs
    await this.autoScroll();

    // Extract job links and basic info - using a more flexible selector
    const jobElements = await this.page.evaluate(() => {
      // Find all links that look like job postings
      const links = Array.from(document.querySelectorAll('a'));
      
      return links
        .filter(link => {
          const href = link.getAttribute('href');
          // Filter for job links - they typically contain job-related paths
          return href && (
            href.includes('/jobs/') ||
            href.includes('/job/') ||
            href.includes('/careers/') ||
            href.includes('/positions/')
          );
        })
        .map(el => {
          const href = el.getAttribute('href');
          
          // Try to find title - could be in the link itself or in child elements
          let title = '';
          const titleEl = el.querySelector('h1, h2, h3, h4, [class*="title"], [class*="job-title"]');
          if (titleEl) {
            title = titleEl.textContent.trim();
          } else {
            // If no title element, use the link text itself
            title = el.textContent.trim().split('\n')[0].trim();
          }
          
          // Extract department, location, work type from text content
          const fullText = el.textContent;
          const lines = fullText.split('\n').map(l => l.trim()).filter(l => l);
          
          let department = '';
          let location = '';
          let workType = '';
          
          // Try to extract from structured elements
          const deptEl = el.querySelector('[class*="department"], [class*="team"]');
          const locEl = el.querySelector('[class*="location"]');
          const typeEl = el.querySelector('[class*="hybrid"], [class*="remote"], [class*="office"], [class*="work"]');
          
          if (deptEl) department = deptEl.textContent.trim();
          if (locEl) location = locEl.textContent.trim();
          if (typeEl) workType = typeEl.textContent.trim();
          
          // Fallback: parse from text lines
          if (!department && lines.length > 1) department = lines[1];
          if (!location && lines.length > 2) location = lines[2];
          if (!workType && lines.length > 3) workType = lines[3];
          
          return {
            url: href.startsWith('http') ? href : `https://careers.blis.com${href}`,
            title: title,
            department: department,
            location: location,
            workType: workType
          };
        });
    });

    // Filter out duplicates and invalid entries
    const uniqueJobs = jobElements.filter((job, index, self) =>
      job.url && job.title && job.title.length > 3 &&
      index === self.findIndex(j => j.url === job.url)
    );

    logger.info(`Found ${uniqueJobs.length} unique job listings`);
    return uniqueJobs;
  }

  /**
   * Scrape detailed information for each job
   */
  async scrapeJobDetails(jobData) {
    logger.info(`Scraping details for: ${jobData.title}`);

    try {
      await this.page.goto(jobData.url, {
        waitUntil: 'networkidle2',
        timeout: config.scraping.timeout
      });

      await delay(1500);

      // Extract job details including department, location, work type, and description
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
        
        // Extract job description
        const descriptionSelectors = [
          'div[class*="description"]',
          'div[class*="content"]',
          'main',
          'article'
        ];

        let description = '';
        for (const selector of descriptionSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            description = element.innerText.trim();
            break;
          }
        }
        
        return { department, location, workType, description };
      });

      // Extract apply URL
      const applyUrl = await this.page.evaluate(() => {
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
        
        if (applyElement) {
          const href = applyElement.getAttribute('href');
          return href || window.location.href + '/apply';
        }
        
        return window.location.href + '/apply';
      });

      // Extract experience level from title
      const experienceLevel = this.extractExperienceLevel(jobData.title, jobDetails.description);

      // Create Job object
      const job = new Job({
        id: jobData.url.split('/').pop(),
        title: jobData.title,
        company: 'Blis',
        department: jobDetails.department || jobData.department,
        location: jobDetails.location || jobData.location,
        workType: jobDetails.workType || jobData.workType,
        experienceLevel: experienceLevel,
        description: jobDetails.description.substring(0, 5000), // Limit description length
        url: jobData.url,
        applyUrl: applyUrl.startsWith('http') ? applyUrl : `https://careers.blis.com${applyUrl}`
      });

      if (job.isValid()) {
        this.jobs.push(job);
        logger.success(`✓ Scraped: ${job.title}`);
      }

    } catch (error) {
      logger.error(`Failed to scrape ${jobData.title}: ${error.message}`);
    }

    // Go back to listings page
    await this.page.goto(config.baseUrl, {
      waitUntil: 'networkidle2'
    });
    await delay(1000);
  }

  /**
   * Extract experience level from job title and description
   */
  extractExperienceLevel(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    // Check for specific experience levels in order of seniority
    if (text.includes('intern') || text.includes('internship')) {
      return 'Internship';
    } else if (text.includes('junior') || text.includes('associate') || text.includes('entry')) {
      return 'Junior/Associate';
    } else if (text.includes('senior') || text.includes('sr.') || text.includes('sr ')) {
      return 'Senior';
    } else if (text.includes('lead') || text.includes('principal') || text.includes('staff')) {
      return 'Lead/Principal';
    } else if (text.includes('manager') || text.includes('head of')) {
      return 'Manager';
    } else if (text.includes('director') || text.includes('vp') || text.includes('vice president')) {
      return 'Director/VP';
    } else if (text.includes('chief') || text.includes('cto') || text.includes('ceo')) {
      return 'Executive';
    }
    
    // Check for years of experience mentioned
    const yearsMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i);
    if (yearsMatch) {
      const years = parseInt(yearsMatch[1]);
      if (years >= 8) return 'Senior';
      if (years >= 5) return 'Mid-Level';
      if (years >= 2) return 'Junior/Associate';
      return 'Entry Level';
    }
    
    // Default to Mid-Level if no specific level found
    return 'Mid-Level';
  }

  /**
   * Auto-scroll to load all content
   */
  async autoScroll() {
    await this.page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    await delay(1000);
  }

  /**
   * Run the complete scraping process
   */
  async scrape() {
    try {
      await this.initialize();
      await this.navigateToJobsPage();
      
      const jobListings = await this.extractJobListings();
      
      logger.section(`Scraping ${jobListings.length} Job Details`);
      
      for (let i = 0; i < jobListings.length; i++) {
        logger.info(`[${i + 1}/${jobListings.length}] Processing job...`);
        await this.scrapeJobDetails(jobListings[i]);
      }

      // Filter jobs to only include India locations
      const indiaJobs = this.jobs.filter(job => {
        const location = job.location.toLowerCase();
        return location.includes('mumbai') ||
               location.includes('india') ||
               location.includes('bangalore') ||
               location.includes('delhi') ||
               location.includes('hyderabad') ||
               location.includes('pune') ||
               location.includes('chennai');
      });

      logger.section('Scraping Complete');
      logger.success(`Successfully scraped ${this.jobs.length} total jobs`);
      logger.info(`Filtered to ${indiaJobs.length} jobs in India`);
      
      return indiaJobs;

    } catch (error) {
      logger.error(`Scraping failed: ${error.message}`);
      throw error;
    } finally {
      await this.close();
    }
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Browser closed');
    }
  }

  /**
   * Get scraped jobs
   */
  getJobs() {
    return this.jobs;
  }
}

export default BlisScraper;

// Made with Bob
